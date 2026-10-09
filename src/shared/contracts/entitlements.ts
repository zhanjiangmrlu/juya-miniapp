import type { LimitedEntitlementDuration } from '@/shared/enums/entitlements'

export interface FormalEntitlement {
  content_pack_id: string
  effective_at: string
  expires_at: string | null
  id: string
  status: string
  title: string
}
export interface LimitedEntitlement {
  achievements?: {
    completed_scenes: number
    learning_days: number
    favorite_vocabulary: number
    favorite_phrases: number
  }
  scene_ids?: string[]
  activated_at: string | null
  activity_id: string
  duration_days: LimitedEntitlementDuration
  expires_at: string | null
  id: string
  scene_count: number
  starts_before: string
  status: string
  title: string
}
export interface EntitlementsResponse {
  server_now?: string
  authorization_pending: boolean
  formal: FormalEntitlement[]
  limited: LimitedEntitlement[]
  version: string
}
