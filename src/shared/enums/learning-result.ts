/** 学习成果卡片名称 */
export const LearningResultLabel = {
  COMPLETED_SCENES: '完成场景',
  FAVORITE_VOCABULARY: '收藏词汇',
  FAVORITE_PHRASES: '收藏语块'
} as const

export type LearningResultLabel = (typeof LearningResultLabel)[keyof typeof LearningResultLabel] &
  string
/** 权威成果读取状态 */
export const LearningResultStatus = {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
} as const
export type LearningResultStatus =
  (typeof LearningResultStatus)[keyof typeof LearningResultStatus] & string
