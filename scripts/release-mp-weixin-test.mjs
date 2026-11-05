import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { uploadWeChat } from './wechat-release-build.mjs'

/** 构建隔离测试包并同步测试OSS，options 指定仓库、输出路径及自动测试版本 */
const buildTestPackage = ({ root, output, candidate }) => {
  const input = path.join(path.dirname(output), 'input')
  cpSync(path.join(root, 'src'), input, { recursive: true })
  const file = path.join(input, 'manifest.json')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  manifest.versionName = candidate.version
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n')
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^(VITE_|UNI_)/i.test(key))
  )
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/build-mp-weixin-test.mjs')],
    {
      cwd: root,
      env: { ...env, UNI_INPUT_DIR: input, UNI_OUTPUT_DIR: output },
      stdio: 'inherit'
    }
  )
  if (result.error || result.status !== 0) throw new Error('测试打包或OSS同步失败，未上传微信包')
}
/** 生成北京时间测试版本，version 为项目版本，now 为本次开始时间 */
const testVersion = (version, now) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${version}-test.${values.year}${values.month}${values.day}.${values.hour}${values.minute}${values.second}`
}
/** 打包并上传测试开发版本，options 注入仓库、时间及隔离测试的构建/上传端口 */
export const runTestRelease = async ({
  root,
  now = new Date(),
  build = buildTestPackage,
  upload = uploadWeChat
}) => {
  const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('项目版本格式无效')
  const candidate = { version: testVersion(version, now) }
  const directory = path.join(root, 'dist/test-release', randomUUID())
  const output = path.join(directory, 'mp-weixin')
  mkdirSync(directory, { recursive: true })
  await build({ root, output, candidate })
  const result = await upload({
    root,
    candidate,
    output,
    directory,
    description: `测试环境 ${candidate.version}`
  })
  writeFileSync(
    path.join(directory, 'result.json'),
    JSON.stringify({ environment: 'test', ...candidate, ...result }, null, 2) + '\n'
  )
  if (result.status !== 'success')
    throw new Error(
      result.status === 'unknown'
        ? `测试包上传结果不明确，请先核对微信后台及 ${directory}/upload.log，禁止直接重试`
        : `测试包上传失败，请检查开发者工具登录、服务端口及 ${directory}/upload.log`
    )
  console.info(`测试开发版本已上传：${candidate.version}；体验版请手动切换；回执：${directory}`)
  return { ...candidate, output, directory }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2)
      throw new Error('用法：pnpm release:mp-weixin:test（仅上传开发版本）')
    await runTestRelease({ root: process.cwd() })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
