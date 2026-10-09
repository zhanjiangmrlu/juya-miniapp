export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: '处理中',
  NEEDS_SUPPLEMENT: '需要补充',
  PENDING: '待处理',
  REOPENED: '已重开',
  RESOLVED: '已处理',
  SUPPLEMENTED: '用户已补充',
  UNRESOLVED_CLOSED: '无法处理并关闭'
}

export const FEEDBACK_CATEGORIES = [
  { label: '内容问题', value: 'CONTENT' },
  { label: '发音问题', value: 'PRONUNCIATION' },
  { label: '显示问题', value: 'DISPLAY' },
  { label: '功能问题', value: 'FUNCTION' }
] as const

export const FEEDBACK_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  CONTENT: '内容问题',
  PRONUNCIATION: '发音问题',
  DISPLAY: '显示问题',
  FUNCTION: '功能问题'
}
export const FEEDBACK_DESCRIPTION_MIN_LENGTH = 1
export const FEEDBACK_DESCRIPTION_MAX_LENGTH = 300
export const FEEDBACK_SCREENSHOT_LIMIT = 1
export const FEEDBACK_REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const FEEDBACK_REOPEN_LIMIT = 1
