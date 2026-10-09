import type { ContactService } from '@/shared/types/contact-profile'
import type { HttpClient } from '@/shared/types/http'

export type { ContactService } from '@/shared/types/contact-profile'

/** 创建联系资料服务，client 为统一身份与幂等请求端口 */
export const createContactService = (client: HttpClient): ContactService => {
  return {
    recordPromptExposure: (idempotencyKey) =>
      client.post('/api/v1/me/contact/prompt-exposures', undefined, { idempotencyKey }),
    correct: (reason) => client.post('/api/v1/me/contact/corrections', { reason }),
    get: () => client.get('/api/v1/me/contact'),
    remove: async () => {
      await client.delete('/api/v1/me/contact')
    },
    save: (wechatId) =>
      client.put('/api/v1/me/contact', {
        consent_confirmed: true,
        consent_version: 'v1',
        source: 'PROFILE',
        wechat_id: wechatId
      })
  }
}
