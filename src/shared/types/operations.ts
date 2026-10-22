import type { StoragePort } from './runtime'
export interface OperationRecord {
  action: string
  path: string
  method: string
  key: string
  originalUnknown?: boolean
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
