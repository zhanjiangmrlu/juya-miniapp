import type { AccountService } from '@/shared/types/account'
import type { HttpClient } from '@/shared/types/http'

export type { AccountService } from '@/shared/types/account'

/** 创建账号生命周期服务，危险操作只发送后端要求的固定契约。 */
export function createAccountService(client: HttpClient): AccountService {
  return {
    clearLearningData: async () => {
      await client.delete('/api/v1/me/learning-data', { confirmation: 'CLEAR_LEARNING_DATA' })
    },
    requestDeletion: () => client.post('/api/v1/me/deletion'),
    revokeDeletion: () => client.post('/api/v1/me/deletion/revoke')
  }
}
