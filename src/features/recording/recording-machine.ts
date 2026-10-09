import type { RecordingStatus } from '@/shared/enums/recording'

export type { RecordingStatus } from '@/shared/enums/recording'

export interface RecordingSnapshot {
  hasRecording?: boolean
  recordingDisabled: boolean
  selectedSentenceId: string | null
  status: RecordingStatus
}

/** 创建录音状态初值，不默认选句也不提前请求权限 */
export const createRecordingSnapshot = (): RecordingSnapshot => {
  return { recordingDisabled: false, selectedSentenceId: null, status: 'IDLE' }
}
