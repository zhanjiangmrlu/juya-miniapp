import type { AudioTarget } from '@/shared/contracts/learning'
import type { ShortReadingKind } from '@/shared/enums/short-reading'

/** 独立短文页面模型，由已提交BFF纯阅读契约显式适配 */
export interface ShortReadingSummary {
  content_id: string
  content_type: typeof ShortReadingKind.CONTENT
  title_en: string
  title_zh: string
  category: string
  topic: string
  level: string
  intro: string
  cover_url?: string | null
  access: string
  is_trial?: boolean
  progress_summary?: { completed_at: string | null } | null
}

export interface ShortReadingListResponse {
  items: ShortReadingSummary[]
  has_more?: boolean
  next_cursor?: string | null
}

export interface ShortReadingParagraph {
  paragraph_id: string
  text: string
}

export interface ShortReadingPosition {
  paragraph_id: string
  offset: number
}

export interface ShortReadingProgress {
  content_id: string
  content_type: typeof ShortReadingKind.CONTENT
  content_version: number
  client_sequence: number
  position: ShortReadingPosition | null
  started_at: string | null
  last_read_at: string | null
  completed_at: string | null
}

export interface ShortReadingPositionRequest extends ShortReadingPosition {
  content_version: number
  client_sequence: number
}

export interface ShortReadingAudioTarget extends AudioTarget {
  content_id: string
  content_type: typeof ShortReadingKind.CONTENT
  content_version: number
  revision_id: string
  resource_id: string
}

export interface ShortReadingDetail extends ShortReadingSummary {
  content_version: number
  revision_id: string
  paragraphs_en: ShortReadingParagraph[]
  translation_zh: string
  whole_audio: ShortReadingAudioTarget | null
  progress: ShortReadingProgress
}

export interface ShortReadingCompletionResponse {
  progress: ShortReadingProgress
  created?: boolean
}

/** BFF短文安全白名单；界面intro通过显式适配取得 */
export interface ShortReadingWirePreview {
  content_id: string
  content_type: typeof ShortReadingKind.CONTENT
  title_en: string
  title_zh: string
  category: string
  topic: string
  level: string
  introduction: string
  cover_url: string | null
  access: string
  progress_summary?: { completed_at: string | null } | null
}

/** BFF段落偏移为字符定位，客户端不能提交滚动像素 */
export interface ShortReadingWireProgress {
  content_id: string
  saved_content_version: number
  client_sequence: number
  paragraph_id: string | null
  offset: number
  started_at: string
  last_read_at: string
  completed_at: string | null
}

export interface ShortReadingWireDetail extends ShortReadingWirePreview {
  content_version: number
  revision_id: string
  schema_version: number
  paragraphs_en: { paragraph_id: string; english: string }[]
  translation_zh: string
  whole_audio: { target_id: string; resource_version: string; duration_ms: number } | null
  progress: ShortReadingWireProgress | null
}

export interface ShortReadingWireCompletion {
  progress: ShortReadingWireProgress
  created: boolean
}
