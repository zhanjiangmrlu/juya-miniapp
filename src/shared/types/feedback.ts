import type {
  CreateFeedbackRequest,
  FeedbackItem,
  FeedbackListResponse,
  FeedbackResolutionRequest,
  FeedbackUploadCredential
} from '@/shared/contracts/feedback'

export interface FeedbackScreenshotDraft {
  mimeType: string
  path: string
  size: number
}

export interface FeedbackDraft {
  category: string
  description: string
  screenshots: FeedbackScreenshotDraft[]
  source?: Record<string, string>
}

export interface FeedbackDraftValidation {
  errors: { category?: string; description?: string; screenshot?: string }
  normalized?: Pick<FeedbackDraft, 'category' | 'description' | 'screenshots' | 'source'>
  valid: boolean
}

export interface FeedbackService {
  create(payload: CreateFeedbackRequest): Promise<FeedbackItem>
  get(id: string): Promise<FeedbackItem>
  getUploadCredential(contentType: string): Promise<FeedbackUploadCredential>
  list(): Promise<FeedbackListResponse>
  resolve(id: string, payload: FeedbackResolutionRequest): Promise<FeedbackItem>
  supplement(id: string, text: string, screenshots?: string[]): Promise<FeedbackItem>
}

export type FeedbackUploader = (
  file: FeedbackScreenshotDraft,
  credential: FeedbackUploadCredential
) => Promise<void>

export type FeedbackSourceScene = {
  scene_id: string
  title: string
  chinese_title: string
  series: string
}

export type FeedbackSupplementValidation = { normalized?: string; valid: boolean }

export type PickedFeedbackFile = { path: string; size: number; type?: string }
