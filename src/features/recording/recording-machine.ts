import { RecordingStatus } from '@/shared/enums/recording'

import type { RecordingSnapshot } from '@/shared/types/recording'

export type { RecordingStatus } from '@/shared/enums/recording'
export type { RecordingSnapshot } from '@/shared/types/recording'

/** 创建录音状态初值，不默认选句也不提前请求权限 */
export const createRecordingSnapshot = (): RecordingSnapshot => {
  return { recordingDisabled: false, selectedSentenceId: null, status: RecordingStatus.IDLE }
}
