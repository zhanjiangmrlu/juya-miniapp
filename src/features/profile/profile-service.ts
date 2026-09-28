import type { HttpClient } from '@/services/http/client'
import type { UserProfile } from '@/shared/contracts/profile'

export interface ProfileService {
  get(): Promise<UserProfile>
}

/** 创建本人档案服务，响应只用于当前用户页面。 */
export function createProfileService(client: HttpClient): ProfileService {
  return { get: () => client.get('/api/v1/me') }
}
