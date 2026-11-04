import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

import pageShareAssets from '../resources/oss/brand/page-share-manifest.json'
import {
  HOME_BACKGROUND_FILE,
  PAGE_BACKGROUND_ORIGINALS,
  PAGE_BACKGROUNDS
} from '../src/shared/constants/ui'
const assets = [
  HOME_BACKGROUND_FILE,
  ...Object.values(PAGE_BACKGROUND_ORIGINALS).map((file) => `backgrounds/${file}`),
  ...Object.values(PAGE_BACKGROUNDS).map((file) => `backgrounds/${file}`),
  ...Object.values(pageShareAssets).map((asset) => `brand/${asset.file}`),
  'fonts/fraunces-regular-1a07e715bff9.woff',
  'fonts/juya-ui-chinese-2de0b76bda1d.woff',
  'fonts/dm-sans-19b2ba846548.woff',
  'fonts/fraunces-italic-0e42d420e3d2.woff',
  'brand/u00-botanical-watercolor@3x.png'
]
/** 将精确白名单请求映射到只读资源，不接受路径解码或目录枚举
 * @param request 原始请求路径
 * @returns 允许的本地文件
 */
export const designAssetFile = (request: string) => {
  const name = request.split('?')[0]?.replace(/^\/design-assets\//, '')
  return request.startsWith('/design-assets/') && name && assets.includes(name)
    ? fileURLToPath(new URL(`../resources/oss/${name}`, import.meta.url))
    : undefined
}
/** 本地资源服务及H5发布资源；微信包不复制外置大图
 * @returns 静态资源插件
 */
export const localDesignAssetsPlugin = (): Plugin => ({
  name: 'local-design-assets',
  /** 注册白名单资源读取
   * @param server 开发服务
   */
  configureServer: (server) => {
    server.middlewares.use((request, response, next) => {
      const file = designAssetFile(request.url || '')
      if (!file) {
        next()
        return
      }
      if (!['GET', 'HEAD'].includes(request.method || '')) {
        response.statusCode = 405
        response.end()
        return
      }
      response.setHeader(
        'Content-Type',
        file.endsWith('.woff')
          ? 'font/woff'
          : file.endsWith('.webp')
            ? 'image/webp'
            : file.endsWith('.jpg')
              ? 'image/jpeg'
              : 'image/png'
      )
      response.setHeader('Cache-Control', 'public, max-age=3600')
      response.end(request.method === 'HEAD' ? undefined : readFileSync(file))
    })
  },
  /** 仅H5产物输出同源外置资源 */
  generateBundle() {
    if (process.env.UNI_PLATFORM !== 'h5') return
    for (const name of assets)
      this.emitFile({
        type: 'asset',
        fileName: `design-assets/${name}`,
        source: readFileSync(designAssetFile(`/design-assets/${name}`)!)
      })
  }
})
