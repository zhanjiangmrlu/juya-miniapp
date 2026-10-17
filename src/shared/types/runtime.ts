export interface StoragePort {
  get(key: string): unknown
  set(key: string, value: unknown): void
  remove(key: string): void
}
export interface HttpRequest {
  path: string
  method: string
  headers: Record<string, string>
  body?: unknown
}
export interface HttpResponse {
  status: number
  data: unknown
}
export type SendRequest = (request: HttpRequest) => Promise<HttpResponse>
export interface SessionPorts {
  storage: StoragePort
  send: SendRequest
  wechatLogin: () => Promise<string>
  onExpired: () => void
  key: () => string
}
