import { FeedbackCategory, FeedbackImageContentType, FeedbackStatus } from '@/shared/enums/feedback'
export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  [FeedbackStatus.IN_PROGRESS]: '处理中',
  [FeedbackStatus.NEEDS_SUPPLEMENT]: '需要补充',
  [FeedbackStatus.PENDING]: '待处理',
  [FeedbackStatus.REOPENED]: '已重开',
  [FeedbackStatus.RESOLVED]: '已处理',
  [FeedbackStatus.SUPPLEMENTED]: '用户已补充',
  [FeedbackStatus.UNRESOLVED_CLOSED]: '无法处理并关闭'
}

export const FEEDBACK_CATEGORIES = [
  { label: '内容问题', value: FeedbackCategory.CONTENT },
  { label: '发音问题', value: FeedbackCategory.PRONUNCIATION },
  { label: '显示问题', value: FeedbackCategory.DISPLAY },
  { label: '功能问题', value: FeedbackCategory.FUNCTION }
] as const

export const FEEDBACK_IMAGE_MIME_TYPES = [
  FeedbackImageContentType.JPEG,
  FeedbackImageContentType.PNG,
  FeedbackImageContentType.WEBP
] as const

export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  [FeedbackCategory.CONTENT]: '内容问题',
  [FeedbackCategory.PRONUNCIATION]: '发音问题',
  [FeedbackCategory.DISPLAY]: '显示问题',
  [FeedbackCategory.FUNCTION]: '功能问题'
}
export const FEEDBACK_DESCRIPTION_MIN_LENGTH = 1
export const FEEDBACK_DESCRIPTION_MAX_LENGTH = 300
export const FEEDBACK_SCREENSHOT_LIMIT = 1
export const FEEDBACK_REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const FEEDBACK_REOPEN_LIMIT = 1
