import type { SessionResponse } from '@/shared/contracts/session'

export interface BootstrapDependencies {
  preload: Array<() => Promise<unknown> | unknown>
  sessionService: {
    loginWithWechat(code: string): Promise<SessionResponse>
    refresh(refreshToken: string): Promise<SessionResponse>
  }
  storage: {
    clear(): void
    getRefreshToken(): string | undefined
    saveTokens(tokens: SessionResponse): void
  }
  wechatLogin(): Promise<string>
}

export type BootstrapResult = { status: 'network-error' } | { status: 'ready' }

export type AppMetadata = {
  description: string
  name: string
}
