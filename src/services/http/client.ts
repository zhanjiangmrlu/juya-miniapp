import { ApiError, NetworkTransportError } from '@/services/http/errors'
import { HttpMethod } from '@/shared/enums/http'

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
  let refreshPending: { generation: number; promise: Promise<string | undefined> } | undefined

  /** 仅复用同代次刷新，generation为命令绑定的账号及学习清理代次 */
  const refreshOnce = (generation: number) => {
    if (refreshPending?.generation === generation) return refreshPending.promise
    const promise = options.session.refresh().finally(() => {
      if (refreshPending?.promise === promise) refreshPending = undefined
    })
    refreshPending = { generation, promise }
    return promise
  }

  /** 发送请求，method为动作，path为接口路径，body为业务内容，requestOptions为身份与幂等设置 */
  const send = async <T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    requestOptions: RequestOptions = {}
  ): Promise<T> => {
    const requiresAuth = requestOptions.auth !== false
    const generation = options.session.getGeneration?.() ?? 0
    /** 拒绝已清理账号的迟到响应与重试，避免旧命令进入新账号 */
    const assertCurrentSession = () => {
      if (requiresAuth && (options.session.getGeneration?.() ?? 0) !== generation)
        throw new ApiError('SESSION_CHANGED', '账号状态已更新，请重新操作', 401)
    }
    if (requiresAuth) await options.session.ensureAuthenticated?.()
    assertCurrentSession()
    const requestId = idFactory()
    const idempotencyKey =
      method === HttpMethod.GET || requestOptions.idempotencyKey === false
        ? undefined
        : (requestOptions.idempotencyKey ?? idFactory())

    /** 执行请求，networkAttempt为网络重试次数，canRefresh控制本次请求能否刷新令牌 */
    const execute = async (networkAttempt: number, canRefresh: boolean): Promise<T> => {
      assertCurrentSession()
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
        assertCurrentSession()
        if (response.status === 401 && requiresAuth && canRefresh) {
          const currentToken = options.session.getAccessToken()
          const renewed =
            currentToken && currentToken !== tokenUsed
              ? currentToken
              : await refreshOnce(generation)
          assertCurrentSession()
          if (!renewed) {
            options.session.clear()
            throw new ApiError('SESSION_EXPIRED', '登录状态已失效，正在重新连接', 401)
          }
          return execute(networkAttempt, false)
        }
        if (
          response.status === 401 &&
          requiresAuth &&
          !canRefresh &&
          options.session.getAccessToken() === tokenUsed
        )
          options.session.clear()
        if (response.status < 200 || response.status >= 300)
          throw mapApiError(
            response.status,
            response.data,
            response.headers['x-request-id'] ?? response.headers['X-Request-ID']
          )
        return response.data
      } catch (error) {
        if (
          error instanceof NetworkTransportError &&
          method === HttpMethod.GET &&
          networkAttempt === 0
        ) {
          return execute(1, canRefresh)
        }
        throw error
      }
    }
    return execute(0, true)
  }
  return {
    delete: (path, body, requestOptions) => send(HttpMethod.DELETE, path, body, requestOptions),
    get: (path, requestOptions) => send(HttpMethod.GET, path, undefined, requestOptions),
    post: (path, body, requestOptions) => send(HttpMethod.POST, path, body, requestOptions),
    patch: (path, body, requestOptions) => send(HttpMethod.PATCH, path, body, requestOptions),
    put: (path, body, requestOptions) => send(HttpMethod.PUT, path, body, requestOptions)
  }
}
import { HTTP_REQUEST_TIMEOUT_MS } from '@/shared/constants/http'
