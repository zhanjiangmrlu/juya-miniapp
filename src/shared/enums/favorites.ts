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

/** 收藏来源在当前发布版本的可访问定位状态 */
export const FavoriteSourceStatus = {
  EXACT: 'EXACT',
  UPDATED_OR_UNRESOLVED: 'UPDATED_OR_UNRESOLVED',
  NO_ACCESS: 'NO_ACCESS'
} as const
export type FavoriteSourceStatus =
  (typeof FavoriteSourceStatus)[keyof typeof FavoriteSourceStatus] & string
/** 翻卡入口的收藏筛选范围 */
export const FavoriteReviewScope = { ALL: 'ALL', BANK: 'BANK' } as const
export type FavoriteReviewScope = (typeof FavoriteReviewScope)[keyof typeof FavoriteReviewScope] &
  string
