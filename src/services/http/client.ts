import { mapApiError } from './error-map'
import { createRequestId } from './request-id'
import {
  ApiError,
  type HttpMethod,
  type HttpTransport,
  NetworkTransportError,
  type TransportRequest
} from './types'
export interface SessionAdapter {
  clear(): void
  getAccessToken(): string | undefined
  refresh(): Promise<string | undefined>
}
export interface RequestOptions {
  auth?: boolean
  idempotencyKey?: string | false
  timeout?: number
}
export interface HttpClient {
  delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
}
export interface HttpClientOptions {
  baseUrl: string
  clientVersion: string
  idFactory?: () => string
  session: SessionAdapter
  transport: HttpTransport
}

/**
 * 创建统一 HTTP 客户端，负责认证头、幂等键、请求追踪、GET 重试和单飞刷新。
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const idFactory = options.idFactory ?? createRequestId
  let refreshPromise: Promise<string | undefined> | undefined

  /** 复用进行中的刷新请求，避免多个 401 同时触发令牌刷新风暴。 */
  async function refreshOnce() {
    refreshPromise ??= options.session.refresh().finally(() => {
      refreshPromise = undefined
    })
    return refreshPromise
  }

  /** 组装并发送单次业务请求，只对幂等 GET 的瞬时网络失败重试一次。 */
  async function send<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const requiresAuth = requestOptions.auth !== false
    const requestId = idFactory()
    const idempotencyKey =
      method === 'GET' || requestOptions.idempotencyKey === false
        ? undefined
        : (requestOptions.idempotencyKey ?? idFactory())

    /** 执行请求并保留网络重试次数及令牌刷新资格，防止无界递归。 */
    const execute = async (networkAttempt: number, canRefresh: boolean): Promise<T> => {
      const tokenUsed = requiresAuth ? options.session.getAccessToken() : undefined
      const headers: Record<string, string> = {
        'X-Client-Version': options.clientVersion,
        'X-Request-ID': requestId
      }
      if (tokenUsed) headers.Authorization = `Bearer ${tokenUsed}`
      if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey
      const request: TransportRequest = {
        body,
        headers,
        method,
        timeout: requestOptions.timeout ?? 10_000,
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
