import type { HttpMethod } from '@/shared/enums/http'

export interface SessionAdapter {
  ensureAuthenticated?(): Promise<void>
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

export type HttpStatusCarrier = { status?: number }

export type ApiBaseUrlOptions = { developmentOrigin?: string; mock?: boolean }
