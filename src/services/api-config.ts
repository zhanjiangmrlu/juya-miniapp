import type { ApiBaseUrlOptions } from '@/shared/types/http'

import { DEFAULT_API_BASE_URL } from '../shared/constants/http'

/** H5 开发使用同源代理；小程序、生产和 mock 保留绝对 API 地址。 */
export function resolveApiBaseUrl(
  configured: string | undefined,
  options: ApiBaseUrlOptions = {}
): string {
  if (options.developmentOrigin && !options.mock) return options.developmentOrigin
  return configured || DEFAULT_API_BASE_URL
}

/** 建立同源代理，configured为环境文件地址，processOverride为本次联调进程优先配置 */
export const createDevApiProxy = (configured: string | undefined, processOverride?: string) => {
  return {
    '/api/v1': {
      changeOrigin: true,
      target: processOverride ?? (configured || DEFAULT_API_BASE_URL)
    }
  }
}
