/** 学习成果卡片名称 */
export const LearningResultLabel = {
  COMPLETED_SCENES: '完成场景',
  FAVORITE_VOCABULARY: '收藏词汇',
  FAVORITE_PHRASES: '收藏语块'
} as const

export type LearningResultLabel = (typeof LearningResultLabel)[keyof typeof LearningResultLabel] &
  string
