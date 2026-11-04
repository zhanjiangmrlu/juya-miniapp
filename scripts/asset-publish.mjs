import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { assertBuildManifest, collectAssetCatalog } from './asset-manifest.mjs'

const targets = {
  test: {
    bucket: 'juya-test',
    publicBase: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static'
  },
  production: { bucket: 'juya', publicBase: 'https://api.juyayingyu.com/miniapp/static' }
}
/** 计算资源字节哈希，body 为待比对内容 */
const digest = (body) => createHash('sha256').update(body).digest('hex')
/** 收集待发布资源，root 为当前小程序仓库 */
export const collectAssets = (root) => collectAssetCatalog(root).assets
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
  manifestFile,
  store,
  mirror,
  readPublic = fetchPublic
}) => {
  if (!Object.hasOwn(targets, environment)) throw new Error('资源发布环境必须为test或production')
  const target = targets[environment],
    catalog = collectAssetCatalog(root)
  if (manifestFile) assertBuildManifest(catalog, manifestFile)
  const assets = catalog.assets
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
