import { describe, expect, it, vi } from 'vitest'

import { presentCatalog } from '@/features/learning/catalog-presenter'
import { createProfileService } from '@/features/profile/profile-service'
import { createHttpClient } from '@/services/http/client'
import { adaptUserProfile } from '@/services/profile-response'

import type { components } from '../fixtures/contracts/v15-19f28ef/provider'

import openapi from '../fixtures/contracts/v15-19f28ef/openapi.json'

const me = {
  public_id: 'fixture-user',
  juya_number: 'JU001',
  status: 'ACTIVE',
  nickname: '学习者',
  avatar_object_key: 'avatars/fixture.png',
  avatar_url: 'https://media.example.test/controlled-avatar',
  created_at: null,
  last_active_at: null,
  contact: null,
  contact_prompt_eligible: false,
  deletion: null
} satisfies components['schemas']['MeResponse']

describe('BFF19f28ef已提交后续字段消费', () => {
  it('本人签名头像原样展示，POST资料使用公开方法与生成请求类型', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, headers: {}, data: me })
    const client = createHttpClient({
      baseUrl: 'https://api.example.test',
      clientVersion: '1.5',
      transport: { request },
      session: {
        getAccessToken: () => 'fixture-token',
        refresh: async () => undefined,
        clear: vi.fn()
      }
    })
    const payload = {
      nickname: '学习者',
      avatar_object_key: me.avatar_object_key
    } satisfies components['schemas']['ProfileUpdate']
    const profile = await createProfileService(client).update(payload)
    expect(profile).toMatchObject({ avatar_url: me.avatar_url, juya_id: me.juya_number })
    expect(request.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      body: payload,
      headers: { Authorization: 'Bearer fixture-token' }
    })
    expect(openapi.paths['/api/v1/me/profile'].post).toBeDefined()
    expect(adaptUserProfile({ ...me, avatar_url: null }).avatar_url).toBeNull()
  })
  it.each(['NEW', 'ENTITLED', null] as const)(
    '阶段%s消费实际nullable类型而不以旧记录补造',
    (stage) => {
      const catalog: components['schemas']['LearningCatalog'] = {
        items: [],
        user_stage: stage,
        authorization_pending: stage === null
      }
      const result = presentCatalog({ modules: [], catalog: { ...catalog, items: [] } })
      expect(result.stage).toBe(stage === 'ENTITLED' ? 'ENTITLED' : 'NEW')
      expect(result.authorizationPending).toBe(stage === null)
    }
  )
})
