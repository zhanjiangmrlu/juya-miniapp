import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

import {
  assertBuildManifest,
  collectAssetCatalog,
  writeBuildManifest
} from '../scripts/asset-manifest.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
/** 为资源逻辑名及实际版本名建立精确预览索引，catalog 为同一次扫描的结果 */
export const createAssetPreviewIndex = (catalog: ReturnType<typeof collectAssetCatalog>) => {
  const index = new Map<string, string>()
  for (const source of Object.keys(catalog.map)) index.set(source, source)
  // 真实版本地址优先于同名逻辑别名，避免预览发送另一版本的字节
  for (const [source, asset] of Object.entries(catalog.map)) index.set(asset.file, source)
  return index
}
/** 将白名单请求解析为归档路径，request 为原始URL，index 为允许的资源索引 */
const resolveAsset = (request: string, index: Map<string, string>) => {
  const key = request.split('?')[0]?.replace(/^\/design-assets\//, '')
  if (!request.startsWith('/design-assets/') || !key || !index.has(key)) return undefined
  return path.join(root, 'resources/oss', index.get(key)!)
}
/** 检查指定预览请求，request 为未解码路径，不允许目录枚举或路径穿越 */
export const designAssetFile = (request: string) =>
  resolveAsset(request, createAssetPreviewIndex(collectAssetCatalog(root)))
/** 生成包内版本映射及本地预览，微信只编入公开元数据，不复制大图 */
export const localDesignAssetsPlugin = (): Plugin => {
  const manifestFile =
    process.env.JUYA_ASSET_BUILD_MANIFEST ||
    path.join(root, 'dist/asset-build', `${randomUUID()}.json`)
  const catalog = collectAssetCatalog(root),
    index = createAssetPreviewIndex(catalog)
  writeBuildManifest(root, manifestFile, catalog)
  return {
    name: 'local-design-assets',
    /** 将当前构建的公开映射注入应用 */
    config: () => ({ define: { __JUYA_ASSET_MANIFEST__: JSON.stringify(catalog.map) } }),
    /** 注册只读预览并在资源更换后重建映射，server 为当前Vite开发服务 */
    configureServer: (server) => {
      const base = path.join(root, 'resources/oss')
      server.watcher.add(base)
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(base + path.sep)) void server.restart()
      })
      server.middlewares.use((request, response, next) => {
        const file = resolveAsset(request.url || '', index)
        if (!file) {
          next()
          return
        }
        if (!['GET', 'HEAD'].includes(request.method || '')) {
          response.statusCode = 405
          response.end()
          return
        }
        const source = path.relative(base, file).split(path.sep).join('/')
        const body = readFileSync(file)
        if (createHash('sha256').update(body).digest('hex') !== catalog.sources[source]) {
          response.statusCode = 503
          response.end()
          return
        }
        const type = file.endsWith('.woff')
          ? 'font/woff'
          : file.endsWith('.webp')
            ? 'image/webp'
            : /\.jpe?g$/.test(file)
              ? 'image/jpeg'
              : file.endsWith('.svg')
                ? 'image/svg+xml'
                : file.endsWith('.gif')
                  ? 'image/gif'
                  : 'image/png'
        response.setHeader('Content-Type', type)
        response.setHeader('Cache-Control', 'no-cache')
        response.end(request.method === 'HEAD' ? undefined : body)
      })
    },
    /** 仅H5输出与映射一致的图片文件 */
    generateBundle() {
      if (process.env.UNI_PLATFORM !== 'h5') return
      const emitted = new Set<string>()
      for (const asset of Object.values(catalog.map)) {
        if (emitted.has(asset.file)) continue
        emitted.add(asset.file)
        this.emitFile({
          type: 'asset',
          fileName: `design-assets/${asset.file}`,
          source: readFileSync(path.join(root, 'resources/oss', index.get(asset.file)!))
        })
      }
    },
    /** 编译结束时核对图片未被替换，防止清单与实际内容混用 */
    closeBundle() {
      assertBuildManifest(collectAssetCatalog(root), manifestFile)
    }
  }
}
