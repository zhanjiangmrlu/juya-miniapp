import { CONSENT_VERSION, SESSION_STORAGE_KEY } from '@/shared/constants/account'

import type { AccountProfile, LoginResult, StoredSession } from '@/shared/types/account'
import type { HttpRequest, SessionPorts } from '@/shared/types/runtime'

import { ApiError, isUnconfirmedFailure } from './errors'

/** 创建主动登录与可撤销业务会话，不自动向微信重新索取身份
 * @param ports 平台存储、HTTP、微信登录及界面通知端口
 */
export const createSessionService = (ports: SessionPorts) => {
  /** 只读取本轮业务会话键，旧版会话与管理端凭证不带入 */
  const read = (): StoredSession | null => {
    const stored = ports.storage.get(SESSION_STORAGE_KEY) as StoredSession | undefined
    return stored &&
      typeof stored.access_token === 'string' &&
      stored.access_token.startsWith('mini_') &&
      typeof stored.user_id === 'string'
      ? stored
      : null
  }
  let current = read(),
    pendingLogin: { code: string; key: string } | null = null
  let loginGeneration = 0
  /** 清理凭证及尚未完成的登录操作 */
  const clear = () => {
    loginGeneration++
    current = null
    pendingLogin = null
    ports.storage.remove(SESSION_STORAGE_KEY)
  }
  /** 发送受控业务请求，网络异常保留未知状态
   * @param input 路由、方法、正文和固定请求头
   * @param authenticated 是否使用本人业务Token
   */
  const send = async <T>(input: HttpRequest, authenticated: boolean): Promise<T> => {
    if (authenticated && !current) {
      ports.onExpired()
      throw new ApiError('unauthenticated', '请先同意并登录')
    }
    const credential = current?.access_token
    let response
    try {
      response = await ports.send({
        ...input,
        headers: {
          ...input.headers,
          ...(authenticated && current ? { Authorization: `Bearer ${current.access_token}` } : {})
        }
      })
    } catch {
      throw new ApiError('network_unknown', '网络连接中断，请重试以确认结果')
    }
    if (authenticated && current?.access_token !== credential)
      throw new ApiError('session_changed', '账号状态已变化，请重新登录')
    const result = response.data as {
      error?: { code?: string; message?: string; details?: { field?: string; message?: string }[] }
    } | null
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401 && authenticated) {
        clear()
        ports.onExpired()
      }
      throw new ApiError(
        result?.error?.code || 'request_failed',
        result?.error?.message || '请求暂未成功，请重试',
        response.status,
        result?.error?.details || []
      )
    }
    if (!result || typeof result !== 'object')
      throw new ApiError('response_unknown', '请求结果暂未确认，请重试以恢复结果')
    return response.data as T
  }
  /** 使用已有业务Token恢复资料，不依据设备时间重新创建账号 */
  const restore = async (): Promise<AccountProfile | null> => {
    current = read()
    if (!current) return null
    const expectedId = current.user_id
    const user = await send<AccountProfile>(
      { path: '/api/mini/v1/me', method: 'GET', headers: {} },
      true
    )
    if (user.id !== expectedId) {
      clear()
      ports.onExpired()
      throw new ApiError('session_changed', '账号状态已变化，请重新登录')
    }
    return user
  }
  /** 仅在用户明确同意后兑换微信临时code，未知响应复用原操作
   * @param agreed 用户主动勾选的同意状态
   */
  const login = async (agreed: boolean): Promise<LoginResult> => {
    if (!agreed) throw new ApiError('consent_required', '请先阅读并同意隐私及用途说明')
    const generation = loginGeneration
    if (!pendingLogin) {
      let code: string
      try {
        code = await ports.wechatLogin()
      } catch {
        throw new ApiError('wechat_unavailable', '微信登录暂未成功，请重试')
      }
      if (!code) throw new ApiError('wechat_unavailable', '未取得微信登录凭证，请重试')
      if (generation !== loginGeneration)
        throw new ApiError('session_changed', '登录已取消，请重新发起')
      pendingLogin = { code, key: ports.key() }
    }
    try {
      const result = await send<LoginResult>(
        {
          path: '/api/mini/v1/auth/wechat',
          method: 'POST',
          headers: { 'Idempotency-Key': pendingLogin.key },
          body: { code: pendingLogin.code, consent: true, consent_version: CONSENT_VERSION }
        },
        false
      )
      if (generation !== loginGeneration)
        throw new ApiError('session_changed', '登录已取消，请重新发起')
      current = {
        access_token: result.access_token,
        user_id: result.user.id,
        expires_at: result.expires_at
      }
      ports.storage.set(SESSION_STORAGE_KEY, current)
      pendingLogin = null
      return result
    } catch (reason) {
      if (
        generation === loginGeneration &&
        reason instanceof ApiError &&
        !isUnconfirmedFailure(reason)
      )
        pendingLogin = null
      throw reason
    }
  }
  /** 访问本人学习或资料接口
   * @param path 小程序业务接口路径
   * @param options 方法、正文及操作标识
   */
  const request = <T>(
    path: string,
    options: { method?: string; body?: unknown; key?: string } = {}
  ): Promise<T> =>
    send<T>(
      {
        path,
        method: options.method || 'GET',
        body: options.body,
        headers: options.key ? { 'Idempotency-Key': options.key } : {}
      },
      true
    )
  /** 注销服务端会话后再清除本地凭证 */
  const logout = async () => {
    await request('/api/mini/v1/auth/logout', { method: 'POST' })
    clear()
  }
  /** 返回当前稳定账号编号，用于隔离待确认操作 */
  const userId = () => current?.user_id || null
  return { restore, login, request, logout, clear, userId }
}
