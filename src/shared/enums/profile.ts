/** 个人页面支持的导航入口 */
export const ProfileTabKey = {
  FAVORITES: 'favorites',
  PROFILE: 'profile'
} as const

export type ProfileTabKey = (typeof ProfileTabKey)[keyof typeof ProfileTabKey] & string

/** 个人页面列表行尺寸 */
export const ProfileRowSize = {
  SHORT: 'short',
  NORMAL: 'normal',
  TALL: 'tall',
  SMALL: 'small'
} as const

export type ProfileRowSize = (typeof ProfileRowSize)[keyof typeof ProfileRowSize] & string
