import { adaptUserProfile } from '@/services/profile-response'

import type { HttpClient } from '@/services/http/client'
import type { UserProfile, UserProfileResponse } from '@/shared/contracts/profile'
export interface ProfileService {
  get(): Promise<UserProfile>
}
/** 创建本人档案服务，client 为统一认证客户端 */
export const createProfileService = (client: HttpClient): ProfileService => ({
  get: async () =>
    adaptUserProfile(await client.get<UserProfileResponse | UserProfile>('/api/v1/me'))
})
