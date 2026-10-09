import type { FavoriteItem } from '@/shared/contracts/favorites'
import type { FavoriteService } from '@/shared/types/favorites'

import { presentFavorites } from './favorite-presenter'

/** 读取完整聚合收藏，service 为当前账号服务，id 为所选收藏标识 */
export const loadFavoriteGroup = async (service: FavoriteService, id: string) => {
  const item = await service.get(id)
  const candidates = new Map<string, FavoriteItem>([[item.id, item]])
  const seenCursors = new Set<string>()
  let cursor: string | undefined
  do {
    const page = await service.list(cursor)
    for (const candidate of page.items) {
      if (candidate.entry_type === item.entry_type && !candidates.has(candidate.id)) {
        candidates.set(candidate.id, candidate)
      }
    }
    const next = page.has_more ? page.next_cursor : null
    if (!next || seenCursors.has(next)) break
    seenCursors.add(next)
    cursor = next
  } while (cursor)
  const group = presentFavorites([...candidates.values()]).find((group) =>
    group.items.some((candidate) => candidate.id === item.id)
  )
  const latest = await Promise.all(
    (group?.items || [item]).map((candidate) =>
      candidate.id === item.id ? item : service.get(candidate.id)
    )
  )
  return { item, group: presentFavorites(latest)[0] }
}
