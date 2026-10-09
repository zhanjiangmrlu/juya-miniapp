import { describe, expect, it, vi } from 'vitest'

import { createContactService } from '@/features/contact-profile/contact-service'

describe('联系提示曝光接口', () => {
  it('使用同一幂等键登记一次实际曝光', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ created: true }),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
    const service = createContactService(client)
    expect(await service.recordPromptExposure('exposure-1')).toEqual({ created: true })
    expect(client.post).toHaveBeenCalledWith('/api/v1/me/contact/prompt-exposures', undefined, {
      idempotencyKey: 'exposure-1'
    })
  })
})
