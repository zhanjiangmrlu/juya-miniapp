export type RecordingStatus = 'DENIED' | 'IDLE' | 'PLAYBACK' | 'RECORDED' | 'RECORDING'

export interface RecordingSnapshot {
  recordingDisabled: boolean
  selectedSentenceId: string | null
  status: RecordingStatus
}

/** 创建录音状态初值，不默认选句也不提前请求权限。 */
export function createRecordingSnapshot(): RecordingSnapshot {
  return { recordingDisabled: false, selectedSentenceId: null, status: 'IDLE' }
}
