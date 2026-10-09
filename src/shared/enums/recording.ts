/** 录音回听事件类型 */
export type RecordingPlaybackEventType = 'play' | 'pause' | 'ended' | 'error'

/** 录音与回听状态 */
export type RecordingStatus =
  'DENIED' | 'FAILED' | 'IDLE' | 'PAUSED' | 'PLAYBACK' | 'RECORDED' | 'RECORDING'
