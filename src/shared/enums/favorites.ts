/** 复习卡片正反面 */
export const ReviewCardFace = {
  BACK: 'BACK',
  FRONT: 'FRONT'
} as const

export type ReviewCardFace = (typeof ReviewCardFace)[keyof typeof ReviewCardFace] & string

/** 收藏内容类型 */
export const FavoriteType = {
  VOCABULARY: 'VOCABULARY',
  PHRASE: 'PHRASE'
} as const

export type FavoriteType = (typeof FavoriteType)[keyof typeof FavoriteType] & string
