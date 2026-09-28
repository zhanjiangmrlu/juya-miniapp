export interface UserProfile {
  avatar_url: string | null
  deletion?: { effective_at: string; status: string } | null
  juya_id: string
  nickname: string | null
  wechat_nickname?: string | null
}
export interface ContactProfile {
  can_modify: boolean
  contact_status: string
  modified_at: string | null
  wechat_id: string | null
}
export interface ContactCorrection {
  created_at: string
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}
