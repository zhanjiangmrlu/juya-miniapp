/** 分享内容类别 */
export const ShareTarget = { HOME: 'home', SCENE: 'scene' } as const
export type ShareTarget = (typeof ShareTarget)[keyof typeof ShareTarget] & string

/** 微信分享渠道 */
export const ShareChannel = { FRIEND: 'friend', TIMELINE: 'timeline' } as const
export type ShareChannel = (typeof ShareChannel)[keyof typeof ShareChannel] & string
