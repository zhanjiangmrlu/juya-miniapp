import type { AudioTarget } from '@/shared/contracts/learning'
import type { AudioButtonVariant, AudioStatus } from '@/shared/enums/audio'

/** AudioButton 输入属性 */
export type AudioButtonProps = {
  currentKey?: string | null
  label?: string
  status: AudioStatus
  target: AudioTarget
  variant?: AudioButtonVariant
  selected?: boolean
}

/** AudioButton 事件契约 */
export type AudioButtonEmits = { play: [target: AudioTarget] }
