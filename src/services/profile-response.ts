import type { UserProfile, UserProfileResponse } from '@/shared/contracts/profile'

/** 将正式资料或本地兼容响应转换为页面模型，response 为 HTTP 资料响应 */
export const adaptUserProfile = (response: UserProfileResponse | UserProfile): UserProfile => {
  if ('juya_id' in response) return response
  return {
    juya_id: response.juya_number,
    nickname: response.nickname,
    avatar_url: response.avatar_url ?? null,
    contact_prompt_eligible: response.contact_prompt_eligible ?? false,
    ...(response.deletion ? { deletion: response.deletion } : {})
  }
}
