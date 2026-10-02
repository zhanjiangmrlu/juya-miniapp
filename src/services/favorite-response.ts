import type { FavoriteItem } from '@/shared/contracts/favorites'

/** 从收藏来源固定快照恢复释义与可选发音，item 为服务端收藏响应 */
export const adaptFavoriteItem = (item: FavoriteItem): FavoriteItem => {
  const source = item.sources.find((value) => value.entry_snapshot)
  const entry = source?.entry_snapshot
  const audio =
    entry?.audio_target_id && entry.audio_version_id && source?.revision_id
      ? {
          target_id: entry.audio_target_id,
          version_id: entry.audio_version_id,
          target_type: item.entry_type === 'PHRASE' ? 'phrase' : 'word',
          scene_id: source.scene_id,
          revision_id: source.revision_id,
          resource_id: entry.audio_target_id
        }
      : item.audio
  return {
    ...item,
    english: entry?.english || item.english || item.normalized_key,
    chinese: entry?.chinese || item.chinese || item.translation,
    phonetic: entry?.phonetic || item.phonetic,
    explanation: entry?.explanation || item.explanation,
    audio
  }
}
