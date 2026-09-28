import type { FavoriteItem, FavoriteSource } from '@/shared/contracts/favorites'

export interface FavoriteSourceViewModel extends FavoriteSource {
  returnUrl: string | null
}

export interface FavoriteGroup {
  displayKey: string
  items: FavoriteItem[]
  sources: FavoriteSourceViewModel[]
}

/** 仅为展示统一大小写和连续空格，不进行词形还原或语义合并。 */
function normalizeDisplayKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

/** 将可访问来源转换为稳定定位路由，无权限来源明确返回 null。 */
function presentSource(source: FavoriteSource): FavoriteSourceViewModel {
  return {
    ...source,
    returnUrl: source.original_link
      ? `/pages/scene/return-source?sceneId=${encodeURIComponent(source.scene_id)}&sourceLocator=${encodeURIComponent(source.source_locator)}`
      : null
  }
}

/** 按展示键聚合收藏条目，同时完整保留所有来源记录。 */
export function presentFavorites(items: FavoriteItem[]): FavoriteGroup[] {
  const groups = new Map<string, FavoriteGroup>()

  for (const item of items) {
    const displayKey = normalizeDisplayKey(item.normalized_key)
    const existing = groups.get(displayKey)
    if (existing) {
      existing.items.push(item)
      existing.sources.push(...item.sources.map(presentSource))
      continue
    }

    groups.set(displayKey, {
      displayKey,
      items: [item],
      sources: item.sources.map(presentSource)
    })
  }

  return [...groups.values()]
}
