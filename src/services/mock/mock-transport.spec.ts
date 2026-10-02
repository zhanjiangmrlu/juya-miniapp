import { describe, expect, it } from 'vitest'

import { MockTransport } from './mock-transport'

describe('本地联系提示曝光', () => {
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
