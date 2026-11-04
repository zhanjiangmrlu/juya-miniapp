import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

import { publishAssets } from './asset-publish.mjs'
import { buildProduction, uploadWeChat } from './wechat-release-build.mjs'

const recordPath = 'release/wechat-version.json'
const manifestPath = 'src/manifest.json'
/** 执行 Git，root 为仓库目录，args 为独立参数 */
const git = (root, ...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
/** 读取 JSON，file 为文件绝对路径 */
const read = (file) => JSON.parse(readFileSync(file, 'utf8'))
/** 原子保存 JSON，file 为目标路径，value 为待保存记录 */
const save = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  renameSync(temp, file)
}
/** 校验成功记录并计算下一版，record 为最近一次成功上传的版本 */
export const nextVersion = (record) => {
  if (
    !record ||
    typeof record.version !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(record.version) ||
    !Number.isSafeInteger(record.versionCode) ||
    record.versionCode < 1 ||
    !/^[a-f0-9]{40}$/.test(record.sourceCommit || '')
  )
    throw new Error('成功版本记录格式错误，请先核对')
  const numbers = record.version.split('.').map(Number)
  if (
    numbers.some((number) => !Number.isSafeInteger(number)) ||
    !Number.isSafeInteger(numbers[2] + 1) ||
    !Number.isSafeInteger(record.versionCode + 1)
  )
    throw new Error('版本号超出安全整数范围')
  numbers[2] += 1
  return { version: numbers.join('.'), versionCode: record.versionCode + 1 }
}
/** 检查发布分支，root 为仓库目录 */
const checkBranch = (root) => {
  if (git(root, 'branch', '--show-current') !== 'release')
    throw new Error('仅允许在 release 分支执行')
}
/** 查询远程正式分支，root 为仓库目录 */
const remoteHead = (root) => {
  const result = git(root, 'ls-remote', '--exit-code', 'origin', 'refs/heads/release').split(
    /\s/
  )[0]
  if (!/^[a-f0-9]{40}$/.test(result)) throw new Error('无法确定远程 release，请先同步')
  return result
}
/** 检查工作区，root 为仓库目录，allowed 为恢复操作允许修改的文件 */
const checkClean = (root, allowed = []) => {
  const entries = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8'
  })
    .split('\0')
    .filter(Boolean)
  if (
    entries.some(
      (entry) => !allowed.includes(entry.slice(3)) || /[RCUAD?!]/.test(entry.slice(0, 2))
    )
  )
    throw new Error('工作区存在未提交改动，请先处理')
}
/** 验证恢复日志，journal 为待处理记录 */
const validateJournal = (journal) => {
  const expected = nextVersion(journal.previous)
  if (
    !['uploading', 'succeeded', 'committed'].includes(journal.phase) ||
    !/^[a-f0-9]{40}$/.test(journal.sourceCommit || '') ||
    journal.candidate?.version !== expected.version ||
    journal.candidate?.versionCode !== expected.versionCode
  )
    throw new Error('待处理记录损坏，请人工核对')
}
/** 保存成功版本并完成 Git 同步，root 为仓库、journal 为上传结果、journalFile 为恢复日志 */
const finish = (root, journal, journalFile) => {
  validateJournal(journal)
  const head = git(root, 'rev-parse', 'HEAD')
  checkClean(root, journal.phase === 'succeeded' ? [recordPath, manifestPath] : [])
  const originalManifest = JSON.parse(git(root, 'show', `${journal.sourceCommit}:${manifestPath}`))
  const expectedManifest = {
    ...originalManifest,
    versionName: journal.candidate.version,
    versionCode: String(journal.candidate.versionCode)
  }
  const originalRecord = JSON.parse(git(root, 'show', `${journal.sourceCommit}:${recordPath}`))
  const expectedRecord = {
    ...journal.candidate,
    sourceCommit: journal.sourceCommit,
    uploadedAt: journal.uploadedAt
  }
  if (!isDeepStrictEqual(originalRecord, journal.previous))
    throw new Error('待处理版本基准与源码记录不一致')
  if (journal.phase === 'succeeded' && head !== journal.sourceCommit) {
    // Git 提交已经落盘而日志尚未更新时，只接受直接后继且内容精确匹配的版本提交
    checkClean(root)
    const changed = git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', head)
      .split('\n')
      .sort()
    if (
      git(root, 'rev-parse', `${head}^`) !== journal.sourceCommit ||
      !isDeepStrictEqual(changed, [recordPath, manifestPath].sort()) ||
      !isDeepStrictEqual(read(path.join(root, recordPath)), expectedRecord) ||
      !isDeepStrictEqual(read(path.join(root, manifestPath)), expectedManifest)
    )
      throw new Error('源码提交已变化，无法自动恢复版本记录')
    journal.phase = 'committed'
    journal.recordCommit = head
    save(journalFile, journal)
  }
  if (journal.phase === 'succeeded') {
    if (remoteHead(root) !== head)
      throw new Error('上传已成功，但远程发生变化；保留记录，请先核对再恢复')
    const current = read(path.join(root, recordPath))
    const manifest = read(path.join(root, manifestPath))
    if (
      ![originalRecord, expectedRecord].some((value) => isDeepStrictEqual(current, value)) ||
      ![originalManifest, expectedManifest].some((value) => isDeepStrictEqual(manifest, value))
    )
      throw new Error('发布文件存在额外变化，请先核对，不能夹带提交')
    save(path.join(root, manifestPath), expectedManifest)
    save(path.join(root, recordPath), expectedRecord)
    git(root, 'add', '--', recordPath, manifestPath)
    git(
      root,
      'commit',
      '--only',
      '-m',
      `chore(release): 记录小程序${journal.candidate.version}上传成功`,
      '--',
      recordPath,
      manifestPath
    )
    journal.phase = 'committed'
    journal.recordCommit = git(root, 'rev-parse', 'HEAD')
    save(journalFile, journal)
  }
  if (git(root, 'rev-parse', 'HEAD') !== journal.recordCommit)
    throw new Error('待同步提交与当前 HEAD 不一致，请核对')
  // 显式目的地与 ls-remote 一致，不让 pushurl 或默认推送分支重定向版本记录
  const remote = remoteHead(root)
  if (![journal.sourceCommit, journal.recordCommit].includes(remote))
    throw new Error('远程 release 已变化，请核对后同步，禁止强推')
  const pushUrls = git(root, 'remote', 'get-url', '--push', '--all', 'origin').split('\n')
  const fetchUrl = git(root, 'remote', 'get-url', 'origin')
  if (pushUrls.length !== 1 || pushUrls[0] !== fetchUrl)
    throw new Error('origin 推送地址与读取地址不同，请先统一配置')
  if (remote !== journal.recordCommit) git(root, 'push', 'origin', 'HEAD:refs/heads/release')
  if (remoteHead(root) !== journal.recordCommit) throw new Error('远程版本记录未确认同步成功')
  save(
    path.join(
      path.dirname(journalFile),
      'juya-wechat-receipts',
      `${journal.candidate.version}-${journal.sourceCommit}.json`
    ),
    journal
  )
  rmSync(journalFile)
  console.info(`上传记录已同步：${journal.candidate.version}`)
  return journal.candidate
}
/** 执行发布或恢复，options 指定仓库、模式及测试用构建和上传适配器 */
export const runRelease = async ({
  root,
  mode = 'upload',
  build = buildProduction,
  publish = publishAssets,
  upload = uploadWeChat
}) => {
  if (
    ![
      'upload',
      'dry-run',
      'build-only',
      'resume',
      'confirm-uploaded',
      'confirm-not-uploaded'
    ].includes(mode)
  )
    throw new Error('未知发布模式')
  checkBranch(root)
  const common = path.resolve(root, git(root, 'rev-parse', '--git-common-dir'))
  const journalFile = path.join(common, 'juya-wechat-release.json')
  const lock = path.join(common, 'juya-wechat-release.lock')
  // dry-run 不创建锁或文件，但仍拒绝正在执行的发布和未完成日志
  if (mode === 'dry-run') {
    if (existsSync(lock)) throw new Error('发布锁已存在')
    if (existsSync(journalFile)) throw new Error('存在待处理上传，请先恢复')
    checkClean(root)
    if (remoteHead(root) !== git(root, 'rev-parse', 'HEAD'))
      throw new Error('请先同步本地与远程 release')
    const candidate = nextVersion(read(path.join(root, recordPath)))
    console.info(`下一版本：${candidate.version} / ${candidate.versionCode}`)
    return candidate
  }
  try {
    mkdirSync(lock)
  } catch {
    throw new Error('发布锁已存在，请确认没有正在运行的发布')
  }
  try {
    if (['resume', 'confirm-uploaded', 'confirm-not-uploaded'].includes(mode)) {
      if (!existsSync(journalFile)) throw new Error('没有待处理上传记录')
      const journal = read(journalFile)
      validateJournal(journal)
      if (mode === 'confirm-not-uploaded') {
        if (journal.phase !== 'uploading') throw new Error('已确认成功的上传不可撤销')
        checkClean(root)
        if (git(root, 'rev-parse', 'HEAD') !== journal.sourceCommit)
          throw new Error('请回到原上传源码提交核对')
        rmSync(journalFile)
        return
      }
      if (journal.phase === 'uploading') {
        if (mode !== 'confirm-uploaded')
          throw new Error(
            '结果不明确，请在微信后台核对后使用 --confirm-uploaded 或 --confirm-not-uploaded'
          )
        journal.phase = 'succeeded'
        journal.uploadedAt = new Date().toISOString()
        save(journalFile, journal)
      }
      return finish(root, journal, journalFile)
    }
    if (existsSync(journalFile)) throw new Error('存在待处理上传，请先使用恢复命令')
    checkClean(root)
    const sourceCommit = git(root, 'rev-parse', 'HEAD')
    if (remoteHead(root) !== sourceCommit) throw new Error('请先同步本地与远程 release')
    const previous = read(path.join(root, recordPath))
    const candidate = nextVersion(previous)
    console.info(`本次版本：${candidate.version} / ${candidate.versionCode}`)
    const output = await build({ root, candidate })
    if (mode === 'build-only') return candidate
    // 构建期间也可能发生源码切换或外部编辑，上传前重新检查
    checkBranch(root)
    checkClean(root)
    if (git(root, 'rev-parse', 'HEAD') !== sourceCommit || remoteHead(root) !== sourceCommit)
      throw new Error('构建期间源码或远程已变化，请重新构建')
    await publish({ root, environment: 'production' })
    checkBranch(root)
    checkClean(root)
    if (git(root, 'rev-parse', 'HEAD') !== sourceCommit || remoteHead(root) !== sourceCommit)
      throw new Error('资源同步期间源码或远程已变化，请重新构建')
    const journal = { phase: 'uploading', sourceCommit, previous, candidate }
    save(journalFile, journal)
    const result = await upload({ root, candidate, output })
    if (result?.status === 'failed') {
      rmSync(journalFile)
      throw new Error(`上传明确失败，版本未推进：${JSON.stringify(result.info || '')}`)
    }
    if (result?.status !== 'success') throw new Error('上传结果不明确，保留待核对记录')
    journal.uploadInfo = result.info || null
    journal.phase = 'succeeded'
    journal.uploadedAt = new Date().toISOString()
    save(journalFile, journal)
    return finish(root, journal, journalFile)
  } finally {
    rmSync(lock, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const modes = ['dry-run', 'build-only', 'resume', 'confirm-uploaded', 'confirm-not-uploaded']
  if (
    args.length > 1 ||
    (args.length && !modes.includes(args[0].slice(2))) ||
    args.some((arg) => !arg.startsWith('--'))
  ) {
    console.error(
      '用法：pnpm release:mp-weixin [--dry-run|--build-only|--resume|--confirm-uploaded|--confirm-not-uploaded]'
    )
    process.exitCode = 1
  } else {
    runRelease({
      root: fileURLToPath(new URL('../', import.meta.url)),
      mode: args[0]?.slice(2) || 'upload'
    }).catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
  }
}
