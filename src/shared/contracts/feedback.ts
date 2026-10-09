import type { FeedbackImageContentType, FeedbackResolutionAction } from '@/shared/enums/feedback'

export interface FeedbackItem {
  category: string
  created_at: string
  description: string
  id: string
  reply?: string | null
  reopen_count?: number
  resolved_at?: string | null
  screenshots: string[]
  status: string
  supplements?: Array<{ created_at: string; text: string }>
  title?: string
}
export interface FeedbackListResponse {
  has_more: false
  items: FeedbackItem[]
}
export interface FeedbackUploadCredential {
  fields: Record<string, string>
  access_key_id: string
  content_type: FeedbackImageContentType
  expires_at: string
  host: string
  key: string
  max_bytes: number
  policy: string
  signature: string
}

export interface CreateFeedbackRequest {
  category: string
  description: string
  screenshots: string[]
  source?: Record<string, string>
}

export interface FeedbackResolutionRequest {
  action: FeedbackResolutionAction
  reason?: string | null
}
