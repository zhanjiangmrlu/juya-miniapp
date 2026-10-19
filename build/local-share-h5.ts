import type { Plugin } from 'vite'

/** 为独立 H5 分享服务校验请求域名，兼容当前 uni-app 使用的 Vite 版本 */
export const localShareH5Plugin = (): Plugin => ({
  name: 'local-share-h5-host',
  /** 注册开发请求校验
   * @param server 当前独立 H5 开发服务
   */
  configureServer: (server) => {
    server.middlewares.use((request, response, next) => {
      let hostname = ''
      try {
        hostname = new URL(`http://${request.headers.host || ''}`).hostname
      } catch {
        /* Invalid or absent Host headers cannot access the development source */
      }
      if (!['dev-h5.juyayingyu.com', 'localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
        response.statusCode = 403
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end('Development hostname is not allowed')
        return
      }
      next()
    })
  }
})
