import type { HttpClient } from '@/services/http/client'
import type {
  RefreshSessionRequest,
  SessionResponse,
  WechatSessionRequest
} from '@/shared/contracts/session'
export interface SessionService {
  loginWithWechat(code: string): Promise<SessionResponse>
  refresh(refreshToken: string): Promise<SessionResponse>
}
export function createSessionService(client: HttpClient): SessionService {
  return {
    loginWithWechat: (code) =>
      client.post('/api/v1/session/wechat', { code } satisfies WechatSessionRequest, {
        auth: false
      }),
    refresh: (refreshToken) =>
      client.post(
        '/api/v1/session/refresh',
        { refresh_token: refreshToken } satisfies RefreshSessionRequest,
        { auth: false }
      )
  }
}
