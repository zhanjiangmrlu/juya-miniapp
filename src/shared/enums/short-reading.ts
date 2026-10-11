/** 短文模板与独立阅读锚点，不能作为场景位置提交 */
export const ShortReadingKind = {
  CONTENT: 'short_reading',
  PARAGRAPH: 'paragraph',
  WHOLE_AUDIO: 'short_reading_whole'
} as const
export type ShortReadingKind = (typeof ShortReadingKind)[keyof typeof ShortReadingKind] & string

/** BFF短文访问等级，与场景OPEN显式区分 */
export const ShortReadingAccess = {
  TRIAL: 'TRIAL',
  FORMAL: 'FORMAL',
  LIMITED: 'LIMITED',
  PREVIEW: 'PREVIEW',
  NONE: 'NONE'
} as const
export type ShortReadingAccess = (typeof ShortReadingAccess)[keyof typeof ShortReadingAccess] &
  string

/** 纯阅读页面展示状态 */
export const ShortReadingPageStatus = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  READY: 'READY',
  PREVIEW: 'PREVIEW',
  UNAVAILABLE: 'UNAVAILABLE'
} as const
export type ShortReadingPageStatus =
  (typeof ShortReadingPageStatus)[keyof typeof ShortReadingPageStatus] & string
