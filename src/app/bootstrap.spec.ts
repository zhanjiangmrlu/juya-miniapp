import { describe, expect, it, vi } from 'vitest'

import { bootstrapApp } from './bootstrap'

describe('bootstrapApp', () => {
  it('已有 refresh token 时恢复会话并并行预加载', async () => {
    const calls: string[] = []
    const result = await bootstrapApp({
      preload: [
        async () => calls.push('me'),
        async () => calls.push('home'),
        async () => calls.push('unread')
      ],
      sessionService: {
        loginWithWechat: vi.fn(),
        refresh: vi.fn(async () => ({ access_token: 'access', refresh_token: 'refresh-2' }))
      },
      storage: {
        clear: vi.fn(),
        getRefreshToken: () => 'refresh-1',
        saveTokens: vi.fn()
      },
      wechatLogin: vi.fn()
    })

    expect(result).toEqual({ status: 'ready' })
    expect(calls.sort()).toEqual(['home', 'me', 'unread'])
  })

  it('没有令牌时使用微信临时代码建立身份', async () => {
    const loginWithWechat = vi.fn(async () => ({
      access_token: 'access',
      refresh_token: 'refresh'
    }))
    await bootstrapApp({
      preload: [],
      sessionService: { loginWithWechat, refresh: vi.fn() },
      storage: { clear: vi.fn(), getRefreshToken: () => undefined, saveTokens: vi.fn() },
      wechatLogin: vi.fn(async () => 'wx-code')
    })

    expect(loginWithWechat).toHaveBeenCalledWith('wx-code')
  })

  it('登录失败保留首页网络错误状态且不创建游客数据', async () => {
    const saveTokens = vi.fn()
    const result = await bootstrapApp({
      preload: [],
      sessionService: {
        loginWithWechat: vi.fn(async () => {
          throw new Error('offline')
        }),
        refresh: vi.fn()
      },
      storage: { clear: vi.fn(), getRefreshToken: () => undefined, saveTokens },
      wechatLogin: vi.fn(async () => 'wx-code')
    })

    expect(result).toEqual({ status: 'network-error' })
    expect(saveTokens).not.toHaveBeenCalled()
  })
})
