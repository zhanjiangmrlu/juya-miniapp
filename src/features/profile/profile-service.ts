import { adaptUserProfile } from '@/services/profile-response'

import type { UserProfile, UserProfileResponse } from '@/shared/contracts/profile'
import type { HttpClient } from '@/shared/types/http'
import type { ProfileService } from '@/shared/types/profile'
export type { ProfileService } from '@/shared/types/profile'
/** 创建本人档案服务，client 为统一认证客户端 */
export const createProfileService = (client: HttpClient): ProfileService => ({
  get: async () =>
    adaptUserProfile(await client.get<UserProfileResponse | UserProfile>('/api/v1/me'))
})
