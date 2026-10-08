import type { SessionTokens } from './common'

export interface WechatSessionRequest {
  code: string
  device: string
}
export interface RefreshSessionRequest {
  refresh_token: string
}
export interface SessionResponse extends SessionTokens {
  user_id?: string
}
