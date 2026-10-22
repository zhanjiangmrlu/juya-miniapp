import { FeedbackCategory, FeedbackStatus } from '@/shared/enums/feedback'
export const FEEDBACK_TEXT_LIMIT = 500
export const FEEDBACK_IMAGE_LIMIT = 3
export const FEEDBACK_CATEGORIES = [
  { value: FeedbackCategory.CONTENT, label: '内容问题' },
  { value: FeedbackCategory.PRONUNCIATION, label: '发音问题' },
  { value: FeedbackCategory.DISPLAY, label: '显示问题' },
  { value: FeedbackCategory.FUNCTION, label: '功能问题' }
] as const
export const FEEDBACK_STATUS_LABELS = {
  [FeedbackStatus.PENDING]: '待处理',
  [FeedbackStatus.PROCESSING]: '处理中',
  [FeedbackStatus.NEEDS_INFO]: '待补充',
  [FeedbackStatus.RESOLVED]: '已处理'
}
