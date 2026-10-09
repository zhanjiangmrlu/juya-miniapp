import type { ApiErrorPayload } from '@/shared/contracts/common'

export class NetworkTransportError extends Error {
  readonly code = 'NETWORK_ERROR'

  /** 创建可被请求层识别并按幂等规则重试的网络异常。 */
  constructor(message = '网络连接异常') {
    super(message)
    this.name = 'NetworkTransportError'
  }
}

export class ApiError extends Error {
  /** 保留后端错误码、HTTP 状态和详情，供页面进行稳定分支处理。 */
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 判断未知响应是否满足接口约定的标准错误结构。 */
export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return Boolean(value && typeof value === 'object' && 'code' in value && 'message' in value)
}
