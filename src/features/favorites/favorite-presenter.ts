import type { FavoriteItem, FavoriteSource } from '@/shared/contracts/favorites'
import type { FavoriteGroup, FavoriteSourceViewModel } from '@/shared/types/favorites'

export type { FavoriteSourceViewModel } from '@/shared/types/favorites'
export type { FavoriteGroup } from '@/shared/types/favorites'

/** 统一展示键大小写和空格，value 为收藏原始归一键，不做词形或语义合并 */
const normalizeDisplayKey = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

/** 转换来源定位路由，source 为服务端来源快照，entryId 为该收藏的稳定词条标识 */
const presentSource = (source: FavoriteSource, entryId: string): FavoriteSourceViewModel => {
  return {
    ...source,
    returnUrl: source.original_link
      ? `/sub-packages/scene/return-source?sceneId=${encodeURIComponent(source.scene_id)}&sourceLocator=${encodeURIComponent(source.source_locator)}${source.revision_id ? '&revisionId=' + encodeURIComponent(source.revision_id) : ''}${source.entry_version ? '&entryVersion=' + source.entry_version : ''}${source.revision_id && source.entry_version ? '&entryId=' + encodeURIComponent(entryId) : ''}`
      : null
  }
}

/** 聚合展示键并保留全部来源，items 为当前同类型银行的收藏快照 */
export const presentFavorites = (items: FavoriteItem[]): FavoriteGroup[] => {
  const groups = new Map<string, FavoriteGroup>()

  for (const item of items) {
    const displayKey = normalizeDisplayKey(item.normalized_key)
    const existing = groups.get(displayKey)
    if (existing) {
      existing.items.push(item)
      existing.sources.push(
        ...item.sources.map((source) => presentSource(source, item.entry_stable_id))
      )
      continue
    }

    groups.set(displayKey, {
      displayKey,
      items: [item],
      sources: item.sources.map((source) => presentSource(source, item.entry_stable_id))
    })
  }

  return [...groups.values()]
}
