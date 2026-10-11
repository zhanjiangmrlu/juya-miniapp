import type { FavoriteItem } from '@/shared/contracts/favorites'

/** 获取本人快照固定发音目标，item 为收藏完整资料 */
export const getFavoritePronunciation = (item: FavoriteItem) =>
  item.pronunciation ??
  (item.audio
    ? {
        target_id: item.audio.target_id,
        resource_version: item.audio.version_id,
        can_prepare: false
      }
    : undefined)
