/** 录音回听事件类型 */
export const RecordingPlaybackEventType = {
  PLAY: 'play',
  PAUSE: 'pause',
  ENDED: 'ended',
  ERROR: 'error'
} as const

export type RecordingPlaybackEventType =
  (typeof RecordingPlaybackEventType)[keyof typeof RecordingPlaybackEventType] & string

/** 录音与回听状态 */
export const RecordingStatus = {
  DENIED: 'DENIED',
  FAILED: 'FAILED',
  IDLE: 'IDLE',
  PAUSED: 'PAUSED',
  PLAYBACK: 'PLAYBACK',
  RECORDED: 'RECORDED',
  RECORDING: 'RECORDING'
} as const

export type RecordingStatus = (typeof RecordingStatus)[keyof typeof RecordingStatus] & string
