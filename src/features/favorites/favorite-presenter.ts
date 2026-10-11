import type { FavoriteItem, FavoriteSource } from '@/shared/contracts/favorites'
import type { FavoriteGroup, FavoriteSourceViewModel } from '@/shared/types/favorites'

export type { FavoriteSourceViewModel } from '@/shared/types/favorites'
export type { FavoriteGroup } from '@/shared/types/favorites'

/** 统一展示键大小写和空格，value 为收藏原始归一键，不做词形或语义合并 */
const normalizeDisplayKey = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

/** 保留保存来源并移除旧版本直达入口，source 为服务端固定来源快照 */
const presentSource = (source: FavoriteSource): FavoriteSourceViewModel => {
  return {
    ...source,
    returnUrl: null
  }
}

/** 按收藏ID独立展示，items 为当前同类型银行的有效快照 */
export const presentFavorites = (items: FavoriteItem[]): FavoriteGroup[] => {
  const groups = new Map<string, FavoriteGroup>()

  for (const item of items) {
    if (item.active === false || groups.has(item.id)) continue
    const displayKey = normalizeDisplayKey(item.english || item.normalized_key)
    groups.set(item.id, {
      id: item.id,
      displayKey,
      items: [item],
      sources: item.sources.map(presentSource)
    })
  }

  return [...groups.values()]
}
