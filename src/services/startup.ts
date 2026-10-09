import { createSessionService } from '@/services/auth/session-service'
import { useSessionStore } from '@/stores/session'

import type { SessionResponse } from '@/shared/contracts/session'
import type { HttpClient } from '@/shared/types/http'
import type { SessionBootstrapDependencies } from '@/shared/types/session'

/** 为会话依赖创建单飞登录入口，参数明确存储与微信登录能力 */
export const createSessionBootstrap = (dependencies: SessionBootstrapDependencies) => {
  let pending: Promise<boolean> | undefined
  /** 建立会话，forceWechat 表示首页重连必须重新获取微信临时代码 */
  const run = (forceWechat = false): Promise<boolean> => {
    if (pending) return pending
    if (!forceWechat && dependencies.isAuthenticated()) return Promise.resolve(true)
    pending = (async () => {
      try {
        const refreshToken = !forceWechat && dependencies.refreshToken()
        let tokens: SessionResponse | undefined
        if (refreshToken) {
          try {
            tokens = await dependencies.refresh(refreshToken)
          } catch {
            dependencies.clear()
          }
        }
        tokens ??= await dependencies.login(await dependencies.wechatLogin())
        dependencies.saveTokens(tokens)
        return true
      } catch {
        dependencies.clear()
        return false
      } finally {
        pending = undefined
      }
    })()
    return pending
  }
  return run
}

let bootstrap: ReturnType<typeof createSessionBootstrap> | undefined

/** 获取登录代码，H5 和微信开发包仅在显式本地开发或 mock 模式使用开发身份 */
const wechatLogin = (): Promise<string> => {
  // #ifdef H5 || MP-WEIXIN
  if (
    import.meta.env.DEV &&
    (import.meta.env.VITE_LOCAL_DEV_MODE === 'true' || import.meta.env.VITE_USE_MOCK_API === 'true')
  ) {
    return Promise.resolve('local-development-code')
  }
  // #endif
  return new Promise((resolve, reject) =>
    uni.login({
      provider: 'weixin',
      success: (result) =>
        result.code ? resolve(result.code) : reject(new Error('微信身份暂时不可用')),
      fail: reject
    })
  )
}

/** 为运行时客户端注入会话启动能力，client 为已创建的无循环依赖请求端口 */
export const configureSessionBootstrap = (client: HttpClient): void => {
  const session = useSessionStore()
  if (!bootstrap) {
    session.restore()
    const auth = createSessionService(client)
    bootstrap = createSessionBootstrap({
      isAuthenticated: () => session.isAuthenticated,
      refreshToken: () => session.refreshToken,
      saveTokens: session.saveTokens,
      clear: session.clear,
      wechatLogin,
      login: auth.loginWithWechat,
      refresh: auth.refresh
    })
  }
}

/** 确保身份已建立，forceWechat 为首页重连时重新静默登录 */
export const ensureSession = (forceWechat = false): Promise<boolean> =>
  bootstrap ? bootstrap(forceWechat) : Promise.resolve(false)
