/** 公共按钮样式 */
export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  QUIET: 'quiet',
  DANGER: 'danger'
} as const

export type ButtonVariant = (typeof ButtonVariant)[keyof typeof ButtonVariant] & string

/** 页面视觉层级 */
export const PageTier = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary'
} as const

export type PageTier = (typeof PageTier)[keyof typeof PageTier] & string

/** 页面背景外观 */
export const PageAppearance = {
  DEFAULT: 'default',
  HOME: 'home'
} as const

export type PageAppearance = (typeof PageAppearance)[keyof typeof PageAppearance] & string

/** 卡片表面色调 */
export const SurfaceTone = {
  CARD: 'card',
  MODULE: 'module',
  WHITE: 'white'
} as const

export type SurfaceTone = (typeof SurfaceTone)[keyof typeof SurfaceTone] & string
