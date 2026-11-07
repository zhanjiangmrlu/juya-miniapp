import type { FeedbackDetail } from './feedback'
import type { createFeedbackDraft } from '@/sub-packages/feedback/use-feedback-draft'
export interface FeedbackComposerProps {
  draft: ReturnType<typeof createFeedbackDraft>
  supplement?: boolean
  editable?: boolean
}
export interface FeedbackThreadProps {
  feedback: FeedbackDetail
}
