import type { StablePosition } from '@/shared/contracts/common'
import type { SceneEntry } from '@/shared/contracts/learning'

export interface SheetSnapshot {
  entry: SceneEntry
  open: boolean
  returnPosition: StablePosition
}

export interface SheetController {
  close(): StablePosition
  readonly snapshot: SheetSnapshot
}
