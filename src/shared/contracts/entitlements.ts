export interface FormalEntitlement {
  content_pack_id: string
  effective_at: string
  expires_at: string | null
  id: string
  status: string
  title: string
}
export interface LimitedEntitlement {
  activated_at: string | null
  activity_id: string
  duration_days: 3 | 5
  expires_at: string | null
  id: string
  scene_count: number
  starts_before: string
  status: string
  title: string
}
export interface EntitlementsResponse {
  authorization_pending: boolean
  formal: FormalEntitlement[]
  limited: LimitedEntitlement[]
  version: string
}
