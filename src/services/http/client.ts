import { ApiError, NetworkTransportError } from '@/services/http/errors'

import type { HttpMethod } from '@/shared/enums/http'
import type {
  HttpClient,
  HttpClientOptions,
  RequestOptions,
  TransportRequest
} from '@/shared/types/http'

import { mapApiError } from './error-map'
import { createRequestId } from './request-id'
export type { SessionAdapter } from '@/shared/types/http'
export type { RequestOptions } from '@/shared/types/http'
export type { HttpClient } from '@/shared/types/http'
export type { HttpClientOptions } from '@/shared/types/http'

/**
 * 创建统一 HTTP 客户端，options 提供传输端口、会话状态与请求标识策略
 */
export const createHttpClient = (options: HttpClientOptions): HttpClient => {
  const idFactory = options.idFactory ?? createRequestId
  let refreshPromise: Promise<string | undefined> | undefined

  /** 复用进行中的刷新请求，避免多个 401 同时触发令牌刷新风暴 */
  const refreshOnce = async () => {
    refreshPromise ??= options.session.refresh().finally(() => {
      refreshPromise = undefined
    })
    return refreshPromise
  }

  /** 发送请求，method为动作，path为接口路径，body为业务内容，requestOptions为身份与幂等设置 */
  const send = async <T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    requestOptions: RequestOptions = {}
  ): Promise<T> => {
    const requiresAuth = requestOptions.auth !== false
    if (requiresAuth) await options.session.ensureAuthenticated?.()
    const requestId = idFactory()
    const idempotencyKey =
      method === 'GET' || requestOptions.idempotencyKey === false
        ? undefined
        : (requestOptions.idempotencyKey ?? idFactory())

    /** 执行请求，networkAttempt为网络重试次数，canRefresh控制本次请求能否刷新令牌 */
    const execute = async (networkAttempt: number, canRefresh: boolean): Promise<T> => {
      const tokenUsed = requiresAuth ? options.session.getAccessToken() : undefined
      const headers: Record<string, string> = {
        'X-Client-Version': options.clientVersion,
        'X-Request-ID': requestId
      }
      if (tokenUsed) headers.Authorization = `Bearer ${tokenUsed}`
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey
        headers['X-Idempotency-Key'] = idempotencyKey
      }
      const request: TransportRequest = {
        body,
        headers,
        method,
        timeout: requestOptions.timeout ?? HTTP_REQUEST_TIMEOUT_MS,
        url: `${options.baseUrl.replace(/\/$/, '')}${path}`
      }
      try {
        const response = await options.transport.request<T>(request)
        if (response.status === 401 && requiresAuth && canRefresh) {
          const currentToken = options.session.getAccessToken()
          const renewed =
            currentToken && currentToken !== tokenUsed ? currentToken : await refreshOnce()
          if (!renewed) {
            options.session.clear()
            throw new ApiError('SESSION_EXPIRED', '登录状态已失效，正在重新连接', 401)
          }
          return execute(networkAttempt, false)
        }
        if (response.status < 200 || response.status >= 300)
          throw mapApiError(response.status, response.data)
        return response.data
      } catch (error) {
        if (error instanceof NetworkTransportError && method === 'GET' && networkAttempt === 0) {
          return execute(1, canRefresh)
        }
        throw error
      }
    }
    return execute(0, true)
  }
  return {
    delete: (path, body, requestOptions) => send('DELETE', path, body, requestOptions),
    get: (path, requestOptions) => send('GET', path, undefined, requestOptions),
    post: (path, body, requestOptions) => send('POST', path, body, requestOptions),
    put: (path, body, requestOptions) => send('PUT', path, body, requestOptions)
  }
}
import { HTTP_REQUEST_TIMEOUT_MS } from '@/shared/constants/http'
