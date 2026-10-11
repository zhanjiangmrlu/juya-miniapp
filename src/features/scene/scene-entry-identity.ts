import type { SceneEntry } from '@/shared/contracts/learning'

/** 使用确认义项与来源区分同篇重复条目，entry为授权详情 */
export const sceneEntryKey = (entry: SceneEntry) =>
  JSON.stringify([entry.entry_id, entry.sense_id ?? '', entry.source_id ?? ''])
