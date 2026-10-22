export const ShareTarget = { LEARNING: 'learning', SCENE: 'scene' } as const
export type ShareTarget = (typeof ShareTarget)[keyof typeof ShareTarget] & string
export const ShareChannel = { FRIENDS: 'friends', TIMELINE: 'timeline' } as const
export type ShareChannel = (typeof ShareChannel)[keyof typeof ShareChannel] & string
export const ApiCategory = { DEFAULT: 'default', BROWSE_ONLY: 'browseOnly' } as const
export type ApiCategory = (typeof ApiCategory)[keyof typeof ApiCategory] & string
