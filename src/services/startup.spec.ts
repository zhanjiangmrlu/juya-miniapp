import { describe, expect, it, vi } from 'vitest'

import { createSessionBootstrap } from './startup'

describe('静默会话编排', () => {
  it('并发启动只登录一次，保存会话后再返回成功', async () => {
    const login = vi.fn().mockResolvedValue({ access_token: 'a', refresh_token: 'r' })
    const save = vi.fn()
    const run = createSessionBootstrap({
      isAuthenticated: () => false,
      refreshToken: () => undefined,
      saveTokens: save,
      clear: vi.fn(),
      wechatLogin: async () => 'code',
      login,
      refresh: vi.fn()
    })
    expect(await Promise.all([run(), run()])).toEqual([true, true])
    expect(login).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' })
  })

  it('刷新失效时清理旧会话并静默重登，网络失败不创建游客身份', async () => {
    const clear = vi.fn()
    const login = vi.fn().mockRejectedValue(new Error('offline'))
    const run = createSessionBootstrap({
      isAuthenticated: () => false,
      refreshToken: () => 'old',
      saveTokens: vi.fn(),
      clear,
      wechatLogin: async () => 'code',
      login,
      refresh: vi.fn().mockRejectedValue(new Error('expired'))
    })
    expect(await run()).toBe(false)
    expect(clear).toHaveBeenCalled()
    login.mockResolvedValue({ access_token: 'a', refresh_token: 'r' })
    expect(await run(true)).toBe(true)
  })
})
