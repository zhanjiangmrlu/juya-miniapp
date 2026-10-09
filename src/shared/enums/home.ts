/** 首页学习入口展示模式 */
export const HomeEntryMode = {
  FIRST: 'first',
  TODAY: 'today'
} as const

export type HomeEntryMode = (typeof HomeEntryMode)[keyof typeof HomeEntryMode] & string

/** 首页学习入口动作 */
export const HomeEntryAction = {
  DIALOGUE: 'dialogue',
  SHADOWING: 'shadowing',
  FAVORITES: 'favorites'
} as const

export type HomeEntryAction = (typeof HomeEntryAction)[keyof typeof HomeEntryAction] & string

/** 首页页面展示模式 */
export const HomePageMode = {
  FIRST: 'first',
  NORMAL: 'normal',
  TODAY: 'today'
} as const

export type HomePageMode = (typeof HomePageMode)[keyof typeof HomePageMode] & string

/** 首页今日任务类型 */
export const TodayTaskKind = {
  CONTINUE_SCENE: 'CONTINUE_SCENE',
  NEW_SCENE: 'NEW_SCENE',
  FAVORITE_REVIEW: 'FAVORITE_REVIEW',
  HISTORY_SCENE: 'HISTORY_SCENE'
} as const

export type TodayTaskKind = (typeof TodayTaskKind)[keyof typeof TodayTaskKind] & string

/** 北京时间问候语 */
export const Greeting = {
  AFTERNOON: '下午好',
  MORNING: '早上好',
  EVENING: '晚上好'
} as const

export type Greeting = (typeof Greeting)[keyof typeof Greeting] & string
