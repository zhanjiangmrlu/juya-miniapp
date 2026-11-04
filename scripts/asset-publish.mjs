import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const targets = {
  test: {
    bucket: 'juya-test',
    publicBase: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static'
  },
  production: { bucket: 'juya', publicBase: 'https://api.juyayingyu.com/miniapp/static' }
}
const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff': 'font/woff'
}
/** 计算待发布资源的完整内容哈希，body 为文件字节 */
const digest = (body) => createHash('sha256').update(body).digest('hex')
/** 收集内容哈希命名的运行时资源，root 为当前小程序仓库 */
export const collectAssets = (root) => {
  const base = path.join(root, 'resources/oss')
  if (lstatSync(path.join(root, 'resources')).isSymbolicLink())
    throw new Error('资源不允许符号链接')
  const archivePath = path.join(base, 'publish-archive.json')
  if (existsSync(archivePath) && lstatSync(archivePath).isSymbolicLink())
    throw new Error('资源不允许符号链接')
  let archive = {}
  try {
    if (existsSync(archivePath)) archive = JSON.parse(readFileSync(archivePath, 'utf8'))
  } catch {
    throw new Error('资源归档清单格式错误')
  }
  const assets = []
  /** 检查目录及文件，directory 为待遍历的归档目录 */
  const visit = (directory) => {
    if (lstatSync(directory).isSymbolicLink()) throw new Error('资源不允许符号链接')
    for (const name of readdirSync(directory).sort()) {
      const absolute = path.join(directory, name),
        stat = lstatSync(absolute)
      if (stat.isSymbolicLink()) throw new Error('资源不允许符号链接')
      if (stat.isDirectory()) {
        visit(absolute)
        continue
      }
      if (!stat.isFile()) throw new Error('资源必须为普通文件')
      const file = path.relative(base, absolute).split(path.sep).join('/')
      const extension = path.extname(file)
      if (['.json', '.md'].includes(extension)) continue
      if (!mimeTypes[extension] || !/^[a-z0-9@._/-]+$/.test(file))
        throw new Error(`资源文件名或类型无效：${file}`)
      const body = readFileSync(absolute),
        sha256 = digest(body)
      if (Object.hasOwn(archive, file)) {
        if (archive[file] !== sha256)
          throw new Error(`历史原图已改变，请生成哈希版本并更新引用：${file}`)
        continue
      }
      const hash = /-([a-f0-9]{12})(?:@3x)?\.[^.]+$/.exec(file)?.[1]
      if (!hash || hash !== sha256.slice(0, 12))
        throw new Error(`资源哈希文件名与内容不匹配：${file}`)
      if (body.length > 16 * 1024 * 1024) throw new Error(`资源超过16MiB：${file}`)
      assets.push({
        file,
        key: `miniapp/static/${file}`,
        sha256,
        bytes: body.length,
        body,
        contentType: mimeTypes[extension],
        cacheControl: 'public, max-age=31536000, immutable'
      })
    }
  }
  visit(base)
  return assets
}
/** 读取忽略的私有发布配置，root 为仓库目录，environment 为明确发布环境 */
const credentials = (root, environment) => {
  const file =
    process.env.JUYA_ASSET_PUBLISH_CONFIG || path.join(root, '.private/asset-publish.local.json')
  if (!existsSync(file))
    throw new Error(
      '缺少OSS私有配置，请配置 .private/asset-publish.local.json 或 JUYA_ASSET_PUBLISH_CONFIG'
    )
  let value
  try {
    value = JSON.parse(readFileSync(file, 'utf8'))[environment]
  } catch {
    throw new Error('OSS私有配置读取或格式校验失败')
  }
  if (!value?.accessKeyId || !value?.accessKeySecret)
    throw new Error(`缺少${environment}环境OSS凭据`)
  return value
}
/** 获取无鉴权公网资源，url 为固定环境下的资源访问地址 */
const fetchPublic = async (url) => {
  let response
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) })
    if (
      response.status !== 200 ||
      response.headers.get('cache-control')?.includes('immutable') ||
      attempt === 3
    )
      break
    await response.arrayBuffer()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  const body = Buffer.from(await response.arrayBuffer())
  return {
    status: response.status,
    body,
    contentType: response.headers.get('content-type')?.split(';')[0],
    cacheControl: response.headers.get('cache-control') || ''
  }
}
/** 发布并验证不可变资源，options 指定仓库、环境及测试隔离的存储/镜像/公网端口 */
export const publishAssets = async ({
  root,
  environment,
  store,
  mirror,
  readPublic = fetchPublic
}) => {
  if (!Object.hasOwn(targets, environment)) throw new Error('资源发布环境必须为test或production')
  const target = targets[environment],
    assets = collectAssets(root)
  let config
  if (!store || (environment === 'production' && !mirror)) config = credentials(root, environment)
  if (!store) {
    try {
      const { createOssStore } = await import('./asset-store.mjs')
      store = createOssStore({ bucket: target.bucket, credentials: config })
    } catch {
      throw new Error('OSS客户端配置无效')
    }
  }
  const report = { environment, bucket: target.bucket, entries: [] }
  for (const asset of assets) {
    try {
      let existing = await store.get(asset.key)
      let status = existing === undefined ? 'uploaded' : 'skipped'
      if (existing === undefined) {
        try {
          await store.put(asset)
        } catch (error) {
          if (error.code !== 'FileAlreadyExists') throw error
          status = 'skipped'
        }
        existing = await store.get(asset.key)
      }
      if (!existing || digest(existing) !== asset.sha256)
        throw new Error('资源冲突：禁止覆盖已有对象')
      report.entries.push({
        file: asset.file,
        key: asset.key,
        bytes: asset.bytes,
        sha256: asset.sha256,
        status,
        url: `${target.publicBase}/${asset.file}`
      })
    } catch (error) {
      throw new Error(
        `OSS资源同步失败：${environment}/${asset.file}${error.message === '资源冲突：禁止覆盖已有对象' ? '，资源冲突' : ''}`
      )
    }
  }
  if (environment === 'production') {
    if (mirror) await mirror(assets)
    else {
      const { mirrorProductionAssets } = await import('./asset-production.mjs')
      await mirrorProductionAssets({ assets, config: config.mirror })
    }
  }
  for (const asset of assets) {
    let response
    try {
      response = await readPublic(`${target.publicBase}/${asset.file}`)
    } catch {
      throw new Error(`资源访问校验失败：${asset.file}`)
    }
    if (
      response.status !== 200 ||
      digest(response.body) !== asset.sha256 ||
      response.contentType !== asset.contentType ||
      !response.cacheControl.includes('immutable') ||
      !response.cacheControl.includes('31536000')
    )
      throw new Error(`资源访问校验失败：${asset.file}`)
  }
  const directory = path.join(root, 'dist/asset-publish')
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, `${environment}.json`), JSON.stringify(report, null, 2) + '\n')
  console.info(
    `资源同步完成：${environment}，新增${report.entries.filter((entry) => entry.status === 'uploaded').length}，复用${report.entries.filter((entry) => entry.status === 'skipped').length}`
  )
  return report
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const environment = process.argv[2]
  try {
    if (
      !Object.hasOwn(targets, environment) ||
      process.argv.slice(3).some((arg) => arg !== '--dry-run')
    )
      throw new Error('用法：node scripts/asset-publish.mjs test|production [--dry-run]')
    if (process.argv.includes('--dry-run'))
      console.info(
        JSON.stringify(
          {
            environment,
            bucket: targets[environment].bucket,
            files: collectAssets(process.cwd()).map((asset) => asset.file)
          },
          null,
          2
        )
      )
    else await publishAssets({ root: process.cwd(), environment })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
