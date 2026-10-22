import type { OperationSession } from './operations'
import type { createOperationService } from '@/services/operation-service'
import type { components } from '@/shared/contracts/generated/mini-api'
import type { FeedbackSource, FeedbackUploadStatus } from '@/shared/enums/feedback'

export type FeedbackImage = components['schemas']['FeedbackImage']
export type FeedbackEvent = components['schemas']['FeedbackEvent']
export type FeedbackDetail = components['schemas']['FeedbackDetail']
export type FeedbackPage = components['schemas']['FeedbackPage']
export type FeedbackUnread = components['schemas']['FeedbackUnread']
export type FeedbackReadReceipt = components['schemas']['FeedbackReadReceipt']
export interface FeedbackOrigin {
  source: FeedbackSource
  card_id?: string
  version_id?: string
  title?: string
  titleEn?: string
}
export interface FeedbackAttachment {
  key: string
  path: string
  status: FeedbackUploadStatus
  error: string
  image: FeedbackImage | null
}
export interface FeedbackDraftPorts {
  session: OperationSession
  operations: ReturnType<typeof createOperationService>
  action: string
  owner: string
  source?: FeedbackOrigin
  feedbackId?: string
  key: () => string
}
export interface FeedbackUnreadPorts {
  session: OperationSession
}
export interface FeedbackInboxPorts {
  session: OperationSession
  operations: Pick<ReturnType<typeof createOperationService>, 'run' | 'pending' | 'recover'>
}
