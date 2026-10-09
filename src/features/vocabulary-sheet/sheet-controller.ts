import { SceneEntryType } from '@/shared/enums/learning'

import type { StablePosition } from '@/shared/contracts/common'
import type { SceneEntry } from '@/shared/contracts/learning'
import type { SheetController, SheetSnapshot } from '@/shared/types/vocabulary-sheet'

export type { SheetSnapshot } from '@/shared/types/vocabulary-sheet'
export type { SheetController } from '@/shared/types/vocabulary-sheet'

/** 多个文字命中时优先返回更具体的语块，其次才是单词条目。 */
export function chooseSheetEntry(entries: SceneEntry[]): SceneEntry | undefined {
  return entries.find((entry) => entry.entry_type === SceneEntryType.PHRASE) ?? entries[0]
}

/** 打开词汇或语块弹层，并保存关闭后需要恢复的稳定阅读位置。 */
export function openSheet(entry: SceneEntry, returnPosition: StablePosition): SheetController {
  const snapshot: SheetSnapshot = { entry, open: true, returnPosition }

  return {
    /** 关闭弹层并返回打开前的稳定定位，不使用裸像素作为唯一位置。 */
    close() {
      snapshot.open = false
      return snapshot.returnPosition
    },
    snapshot
  }
}
