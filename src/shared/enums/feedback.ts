export const FeedbackCategory = {
  CONTENT: 'content',
  PRONUNCIATION: 'pronunciation',
  DISPLAY: 'display',
  FUNCTION: 'function'
} as const
export type FeedbackCategory = (typeof FeedbackCategory)[keyof typeof FeedbackCategory] & string
export const FeedbackStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  NEEDS_INFO: 'needs_info',
  RESOLVED: 'resolved'
} as const
export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus] & string
export const FeedbackSource = { PROFILE: 'profile', SCENE: 'scene' } as const
export type FeedbackSource = (typeof FeedbackSource)[keyof typeof FeedbackSource] & string
export const FeedbackUploadStatus = {
  UPLOADING: 'uploading',
  READY: 'ready',
  ERROR: 'error'
} as const
export type FeedbackUploadStatus =
  (typeof FeedbackUploadStatus)[keyof typeof FeedbackUploadStatus] & string
