const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8001'

/** H5 开发使用同源代理；小程序、生产和 mock 保留绝对 API 地址。 */
export function resolveApiBaseUrl(
  configured: string | undefined,
  options: { developmentOrigin?: string; mock?: boolean } = {}
): string {
  if (options.developmentOrigin && !options.mock) return options.developmentOrigin
  return configured || DEFAULT_API_BASE_URL
}

/** 保留用户端路由前缀，由 Vite 转发到实际的小程序 API 服务。 */
export function createDevApiProxy(configured: string | undefined) {
  return {
    '/api/v1': {
      changeOrigin: true,
      target: configured || DEFAULT_API_BASE_URL
    }
  }
}
