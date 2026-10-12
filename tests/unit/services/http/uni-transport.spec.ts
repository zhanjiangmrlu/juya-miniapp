import { afterEach, describe, expect, it, vi } from 'vitest'

import { UniTransport } from '@/services/http/uni-transport'

afterEach(() => vi.unstubAllGlobals())

describe('UniTransport 平台方法兼容', () => {
  it('微信端用应用基础信息拒绝 PATCH，不调用弃用 API', async () => {
    const request = vi.fn()
    vi.stubGlobal('uni', {
      getAppBaseInfo: () => ({ uniPlatform: 'mp-weixin' }),
      request
    })
    await expect(
      new UniTransport().request({
        method: 'PATCH',
        url: 'https://api.test/profile',
        headers: {},
        timeout: 1000
      })
    ).rejects.toMatchObject({ code: 'PROFILE_UPDATE_METHOD_UNAVAILABLE', status: 503 })
    expect(request).not.toHaveBeenCalled()
  })

  it('H5 仍可发送 PATCH 并返回响应', async () => {
    vi.stubGlobal('uni', {
      getAppBaseInfo: () => ({ uniPlatform: 'web' }),
      request: (options: UniApp.RequestOptions) =>
        options.success?.({ data: { saved: true }, statusCode: 200, header: {}, cookies: [] })
    })
    await expect(
      new UniTransport().request({
        method: 'PATCH',
        url: 'https://api.test/profile',
        headers: {},
        timeout: 1000
      })
    ).resolves.toEqual({ data: { saved: true }, status: 200, headers: {} })
  })
})
