/** 底部导航入口 */
export const TabKey = {
  FAVORITES: 'favorites',
  HOME: 'home',
  LEARNING: 'learning',
  PROFILE: 'profile'
} as const

export type TabKey = (typeof TabKey)[keyof typeof TabKey] & string

/** 页面导航方式 */
export const NavigationType = {
  NAVIGATE_TO: 'navigateTo',
  RE_LAUNCH: 'reLaunch',
  REDIRECT_TO: 'redirectTo'
} as const

export type NavigationType = (typeof NavigationType)[keyof typeof NavigationType] & string
