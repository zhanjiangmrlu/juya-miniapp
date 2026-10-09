/** 播放器事件类型 */
export type AudioEventType = 'canplay' | 'play' | 'pause' | 'ended' | 'timeupdate' | 'error'

/** 音频播放状态 */
export type AudioStatus = 'FAILED' | 'IDLE' | 'LOADING' | 'PAUSED' | 'PLAYING'

/** 音频按钮展示样式 */
export type AudioButtonVariant = 'compact' | 'large' | 'inline' | 'pill'
