import type { StoragePort } from './runtime'
export interface OperationRecord {
  action: string
  path: string
  method: string
  key: string
  originalUnknown?: boolean
  /** 仅由明确允许的非敏感业务保存固定请求；个人资料正文仍不落盘 */
  frozenRequest?: string
}
export interface OperationSession {
  userId: () => string | null
  request: <T>(
    path: string,
    options?: { method?: string; body?: unknown; key?: string }
  ) => Promise<T>
}
export interface OperationPorts {
  session: OperationSession
  storage: StoragePort
  key: () => string
}
