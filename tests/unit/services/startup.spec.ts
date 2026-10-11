import { describe, expect, it, vi } from 'vitest'

import { createSessionBootstrap } from '@/services/startup'

describe('静默会话编排', () => {
  it('清理后尚未开始的登录不读取新账号刷新令牌', async () => {
    let generation = 0
    const refresh = vi.fn()
    const login = vi.fn()
    const run = createSessionBootstrap({
      isAuthenticated: () => false,
      getGeneration: () => generation,
      refreshToken: () => 'new-account-refresh',
      saveTokens: vi.fn(),
      clear: vi.fn(),
      wechatLogin: vi.fn(),
      login,
      refresh
    })
    const pending = run()
    generation++
    expect(await pending).toBe(false)
    expect(refresh).not.toHaveBeenCalled()
    expect(login).not.toHaveBeenCalled()
  })
  it.each(['refresh', 'login'] as const)(
    '清理账号后迟到%s不能保存旧身份或清新身份',
    async (mode) => {
      let generation = 0
      const save = vi.fn()
      const clear = vi.fn()
      const late = vi.fn(async () => {
        generation++
        return { access_token: 'old-a', refresh_token: 'old-r' }
      })
      const run = createSessionBootstrap({
        isAuthenticated: () => false,
        getGeneration: () => generation,
        refreshToken: () => (mode === 'refresh' ? 'old' : undefined),
        saveTokens: save,
        clear,
        wechatLogin: async () => 'code',
        login: late as never,
        refresh: late as never
      })
      expect(await run()).toBe(false)
      expect(save).not.toHaveBeenCalled()
      expect(clear).not.toHaveBeenCalled()
    }
  )
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
