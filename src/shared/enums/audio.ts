/** 播放器事件类型 */
export const AudioEventType = {
  CANPLAY: 'canplay',
  PLAY: 'play',
  PAUSE: 'pause',
  ENDED: 'ended',
  TIMEUPDATE: 'timeupdate',
  ERROR: 'error'
} as const

export type AudioEventType = (typeof AudioEventType)[keyof typeof AudioEventType] & string

/** 音频播放状态 */
export const AudioStatus = {
  FAILED: 'FAILED',
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  PAUSED: 'PAUSED',
  PLAYING: 'PLAYING'
} as const

export type AudioStatus = (typeof AudioStatus)[keyof typeof AudioStatus] & string

/** 音频按钮展示样式 */
export const AudioButtonVariant = {
  COMPACT: 'compact',
  LARGE: 'large',
  INLINE: 'inline',
  PILL: 'pill'
} as const

export type AudioButtonVariant = (typeof AudioButtonVariant)[keyof typeof AudioButtonVariant] &
  string

/** 前端已使用的音频目标类型，接口仍允许未知值 */
export const AudioTargetType = {
  SCENE: 'scene',
  SENTENCE: 'sentence',
  WORD: 'word',
  PHRASE: 'phrase',
  LEGACY_ENTRY: 'ENTRY'
} as const
export type AudioTargetType = (typeof AudioTargetType)[keyof typeof AudioTargetType] & string
