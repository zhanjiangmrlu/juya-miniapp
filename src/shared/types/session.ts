import type { SessionResponse } from '@/shared/contracts/session'

export interface SessionService {
  loginWithWechat(code: string): Promise<SessionResponse>
  refresh(refreshToken: string): Promise<SessionResponse>
}

export interface SessionBootstrapDependencies {
  isAuthenticated(): boolean
  refreshToken(): string | undefined
  saveTokens(tokens: SessionResponse): void
  clear(): void
  wechatLogin(): Promise<string>
  login(code: string): Promise<SessionResponse>
  refresh(token: string): Promise<SessionResponse>
}

export type SessionTokenPair = { access_token: string; refresh_token: string }
