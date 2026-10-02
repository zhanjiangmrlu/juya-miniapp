export interface UserProfile {
  contact_prompt_eligible?: boolean
  avatar_url: string | null
  deletion?: { effective_at: string; status: string } | null
  juya_id: string
  nickname: string | null
  wechat_nickname?: string | null
}
export interface UserProfileResponse {
  deletion?: UserProfile['deletion']
  public_id: string
  juya_number: string
  nickname: string | null
  avatar_url?: string | null
  avatar_object_key?: string | null
  contact_prompt_eligible?: boolean
}
export interface ContactProfile {
  can_self_edit: boolean
  change_pending: boolean
  consent_version: string
  contact_status: string
  requires_correction?: boolean
  self_edit_count: number
  updated_at?: string
  wechat_id: string
  withdrawn_at?: string | null
}
export interface ContactCorrection {
  created_at: string
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}
