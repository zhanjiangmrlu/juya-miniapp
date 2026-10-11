import type { PronunciationStatus } from '@/shared/enums/audio'

/** 仅引用后台确认的发音目标，禁止携带任意待合成文本 */
export interface PronunciationTarget {
  target_id: string
  resource_version?: string
  can_prepare?: boolean
  status?: string
}

/** 原文与本人收藏的授权上下文，服务端重新核对引用 */
export interface PronunciationContext {
  favorite_id?: string
  content_type?: string
  content_id?: string
  content_version?: number
  entry_id?: string
  sense_id?: string
  source_id?: string
}

/** 内部统一准备结果，真实传输字段由服务适配 */
export interface PronunciationResult {
  status: PronunciationStatus
  task_id?: string
  resource_version?: string
  url?: string
  can_retry?: boolean
  code?: string
}

/** 服务返回保留后台任务状态，页面统一映射为四态 */
export interface PronunciationWireResult extends Omit<PronunciationResult, 'status'> {
  status: string
  error_code?: string | null
  next_retry_at?: number
}
