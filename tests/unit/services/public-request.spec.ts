import { afterEach, expect, it, vi } from 'vitest'

import { sendPublicRequest, sendRequest } from '@/services/platform'
import { runtimeMode } from '@/services/runtime-mode'

afterEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.unstubAllGlobals()
})

it('permits only anonymous public GET/HEAD paths even with a cached business token', async () => {
  const request = vi.fn((options) => options.success({ statusCode: 200, data: { card_id: 'one' } }))
  vi.stubGlobal('uni', { request })
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await sendPublicRequest({
    path: '/api/mini/v1/public/cards/one/share',
    method: 'GET',
    headers: { Authorization: 'Bearer secret', 'Idempotency-Key': 'foreign' }
  })
  expect(request.mock.calls[0]?.[0].header).toEqual({ 'Content-Type': 'application/json' })
  await expect(
    sendPublicRequest({ path: '/api/mini/v1/me', method: 'GET', headers: {} })
  ).rejects.toThrow()
  await expect(
    sendPublicRequest({ path: '/api/mini/v1/public/cards/one/share', method: 'POST', headers: {} })
  ).rejects.toThrow()
  await expect(
    sendRequest({ path: '/api/mini/v1/cards/one', method: 'GET', headers: {} })
  ).rejects.toMatchObject({ code: 'browse_only' })
  expect(request).toHaveBeenCalledTimes(1)
})
