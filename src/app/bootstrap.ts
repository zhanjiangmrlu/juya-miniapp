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

/**
 * 完成用户端启动编排：优先刷新已有会话，无会话时静默微信登录，随后并行预加载首页数据。
 * 启动异常统一收敛为网络错误态，避免底层异常泄漏到页面。
 */
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
