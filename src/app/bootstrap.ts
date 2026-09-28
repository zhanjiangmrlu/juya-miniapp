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
export async function bootstrapApp(dependencies: BootstrapDependencies): Promise<BootstrapResult> {
  try {
    const refreshToken = dependencies.storage.getRefreshToken()
    const tokens = refreshToken
      ? await dependencies.sessionService.refresh(refreshToken)
      : await dependencies.sessionService.loginWithWechat(await dependencies.wechatLogin())
    dependencies.storage.saveTokens(tokens)
    await Promise.all(dependencies.preload.map(async (load) => load()))
    return { status: 'ready' }
  } catch {
    return { status: 'network-error' }
  }
}
