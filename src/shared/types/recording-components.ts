import type { SceneEntry } from '@/shared/contracts/learning'
import type { AudioStatus } from '@/shared/enums/audio'
import type { RecordingSnapshot } from '@/shared/types/recording'

/** RecordingControls 输入属性 */
export type RecordingControlsProps = {
  sentence?: SceneEntry
  snapshot: RecordingSnapshot
  index?: number
  total?: number
  currentAudioKey?: string | null
  audioStatus?: AudioStatus
}

/** RecordingControls 事件契约 */
export type RecordingControlsEmits = {
  playback: []
  playOriginal: []
  rerecord: []
  start: []
  stop: []
}
