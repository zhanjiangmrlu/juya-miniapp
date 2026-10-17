import type { components } from '@/shared/contracts/generated/mini-api'
export type AccountProfile = components['schemas']['UserProfile']
export type LoginResult = components['schemas']['WechatLoginResponse']
export interface StoredSession {
  access_token: string
  user_id: string
  expires_at?: string
}
