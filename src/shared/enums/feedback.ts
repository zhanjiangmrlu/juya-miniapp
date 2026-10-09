/** 反馈图片媒体类型 */
export const FeedbackImageContentType = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp'
} as const

export type FeedbackImageContentType =
  (typeof FeedbackImageContentType)[keyof typeof FeedbackImageContentType] & string

/** 反馈处理动作 */
export const FeedbackResolutionAction = {
  RESOLVED: 'RESOLVED',
  REOPEN: 'REOPEN'
} as const

export type FeedbackResolutionAction =
  (typeof FeedbackResolutionAction)[keyof typeof FeedbackResolutionAction] & string

/** 前端已识别的反馈状态 */
export const FeedbackStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  NEEDS_SUPPLEMENT: 'NEEDS_SUPPLEMENT',
  PENDING: 'PENDING',
  REOPENED: 'REOPENED',
  RESOLVED: 'RESOLVED',
  SUPPLEMENTED: 'SUPPLEMENTED',
  UNRESOLVED_CLOSED: 'UNRESOLVED_CLOSED'
} as const

export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus] & string

/** 反馈问题分类 */
export const FeedbackCategory = {
  CONTENT: 'CONTENT',
  PRONUNCIATION: 'PRONUNCIATION',
  DISPLAY: 'DISPLAY',
  FUNCTION: 'FUNCTION'
} as const

export type FeedbackCategory = (typeof FeedbackCategory)[keyof typeof FeedbackCategory] & string

/** 反馈时间线发送方 */
export const FeedbackTimelineTone = {
  USER: 'user',
  SERVICE: 'service'
} as const

export type FeedbackTimelineTone =
  (typeof FeedbackTimelineTone)[keyof typeof FeedbackTimelineTone] & string
