import type { ApiErrorPayload } from '@/shared/contracts/common'
export type HttpMethod = 'DELETE' | 'GET' | 'POST' | 'PUT'
export interface TransportRequest {
  body?: unknown
  headers: Record<string, string>
  method: HttpMethod
  timeout: number
  url: string
}
export interface TransportResponse<T> {
  data: T
  headers: Record<string, string>
  status: number
}
export interface HttpTransport {
  request<T>(request: TransportRequest): Promise<TransportResponse<T>>
}
export class NetworkTransportError extends Error {
  readonly code = 'NETWORK_ERROR'
  constructor(message = '网络连接异常') {
    super(message)
    this.name = 'NetworkTransportError'
  }
}
export class ApiError extends Error {
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
export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return Boolean(value && typeof value === 'object' && 'code' in value && 'message' in value)
}
