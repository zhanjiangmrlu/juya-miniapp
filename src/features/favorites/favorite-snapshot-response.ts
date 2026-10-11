import { adaptFavoriteItem } from '@/services/favorite-response'
import { FAVORITE_SNAPSHOT_TYPE_MAP } from '@/shared/constants/favorites'

import type {
  FavoriteItem,
  FavoriteSnapshot,
  StoredFavoriteSnapshot
} from '@/shared/contracts/favorites'

/** 将完整快照投影为现有页面类型，snapshot 为schema2或明确旧投影 */
export const adaptFavoriteSnapshot = (
  snapshot: FavoriteSnapshot | FavoriteItem | StoredFavoriteSnapshot
): FavoriteItem => {
  if ('sources' in snapshot) return adaptFavoriteItem(snapshot)
  if ('data' in snapshot) {
    const { data, ...row } = snapshot
    const { reference, ...detail } = data
    return adaptFavoriteSnapshot({
      ...row,
      ...reference,
      ...detail,
      entry_type: reference.entry_type || ''
    })
  }
  if (!Object.prototype.hasOwnProperty.call(FAVORITE_SNAPSHOT_TYPE_MAP, snapshot.entry_type)) {
    throw new Error('收藏条目类型无法识别，请刷新')
  }
  const type =
    FAVORITE_SNAPSHOT_TYPE_MAP[snapshot.entry_type as keyof typeof FAVORITE_SNAPSHOT_TYPE_MAP]
  const locator =
    typeof snapshot.source_locator === 'string'
      ? snapshot.source_locator
      : snapshot.source_locator?.sentence_id ||
        snapshot.source_locator?.paragraph_id ||
        snapshot.source_id
  return {
    ...snapshot,
    id: snapshot.favorite_id,
    entry_type: type,
    entry_stable_id: snapshot.entry_id,
    normalized_key: snapshot.english,
    chinese: snapshot.meaning_zh ?? snapshot.chinese,
    phonetic: snapshot.phonetic ?? undefined,
    explanation: snapshot.explanation ?? undefined,
    pronunciation: snapshot.pronunciation
      ? {
          ...snapshot.pronunciation,
          resource_version: snapshot.pronunciation.resource_version ?? undefined
        }
      : snapshot.pronunciation,
    sources: [
      {
        scene_id: snapshot.content_id,
        scene_title: snapshot.source_title,
        sentence_snapshot: snapshot.source_sentence,
        source_locator: locator,
        revision_id: snapshot.revision_id,
        original_link: null
      }
    ]
  }
}
