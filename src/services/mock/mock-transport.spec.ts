import { afterEach, describe, expect, it, vi } from 'vitest'

import { MockTransport } from './mock-transport'

afterEach(() => vi.unstubAllGlobals())

describe('本地联系提示曝光', () => {
  it('微信没有 structuredClone 时仍返回独立模拟响应', async () => {
    vi.stubGlobal('structuredClone', undefined)
    const transport = new MockTransport()
    const request = {
      method: 'GET' as const,
      timeout: 1000,
      url: 'http://test/api/v1/learning/catalog',
      headers: {}
    }
    const response = await transport.request<{ items: { title: string }[] }>(request)
    const title = response.data.items[0].title
    response.data.items[0].title = '不能污染下一次响应'
    expect(
      (await transport.request<{ items: { title: string }[] }>(request)).data.items[0].title
    ).toBe(title)
  })
  it('同一个模拟用户在不同设备幂等键下也只登记一次', async () => {
    const transport = new MockTransport()
    const request = {
      method: 'POST' as const,
      timeout: 1000,
      url: 'http://test/api/v1/me/contact/prompt-exposures',
      headers: { 'Idempotency-Key': 'device-a' }
    }
    expect((await transport.request(request)).data).toEqual({ created: true })
    expect(
      (await transport.request({ ...request, headers: { 'Idempotency-Key': 'device-b' } })).data
    ).toEqual({ created: false })
  })
})
