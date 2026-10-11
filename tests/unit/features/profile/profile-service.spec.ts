import { describe, expect, it, vi } from 'vitest'

import { createProfileService } from '@/features/profile/profile-service'
import { createHttpClient } from '@/services/http/client'

describe('本人昵称头像写入', () => {
  it('通过认证PATCH保存昵称且保留本人头像对象键', async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        public_id: 'u1',
        juya_number: 'JU1',
        nickname: '小芽',
        avatar_object_key: 'avatar/u1/p.png'
      }
    })
    const client = createHttpClient({
      baseUrl: 'https://example.test',
      clientVersion: '1.5',
      session: { getAccessToken: () => 'token', refresh: async () => undefined, clear: vi.fn() },
      transport: { request }
    })
    const result = await createProfileService(client).update({
      nickname: '小芽',
      avatar_object_key: 'avatar/u1/p.png'
    })
    expect(request.mock.calls[0][0]).toMatchObject({
      method: 'PATCH',
      url: 'https://example.test/api/v1/me/profile',
      body: { nickname: '小芽', avatar_object_key: 'avatar/u1/p.png' }
    })
    expect(result.avatar_object_key).toBe('avatar/u1/p.png')
  })
})
