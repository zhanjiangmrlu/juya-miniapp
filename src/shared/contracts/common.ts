export interface ApiErrorPayload {
  code: string
  details?: Record<string, unknown>
  message: string
  request_id?: string
}

export interface CursorPage<T> {
  has_more: boolean
  items: T[]
  next_cursor: string | null
}

export interface SessionTokens {
  access_token: string
  expires_in?: number
  refresh_token: string
}

export type { AccessLevel } from '@/shared/enums/entitlements'

export interface StablePosition {
  entry_id: string
  offset: number
}
