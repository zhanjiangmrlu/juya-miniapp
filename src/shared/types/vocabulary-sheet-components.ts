import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'
import type { AudioStatus } from '@/shared/enums/audio'

/** VocabularySheet 输入属性 */
export type VocabularySheetProps = {
  currentAudioKey?: string | null
  entry: SceneEntry
  status: AudioStatus
  sceneTitle?: string
  sourceChinese?: string
}

/** VocabularySheet 事件契约 */
export type VocabularySheetEmits = {
  close: []
  favorite: [entry: SceneEntry]
  play: [target: AudioTarget]
}
