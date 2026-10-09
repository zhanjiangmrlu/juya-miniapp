import { FavoriteType } from '@/shared/enums/favorites'

import type { FavoriteService } from '@/shared/types/favorites'

/** 生成完整收藏复习入口，service 为支持游标分页的收藏服务 */
export const getResultReviewRoute = async (
  service: Pick<FavoriteService, 'list'>
): Promise<string> => {
  const ids = new Set<string>()
  const cursors = new Set<string>()
  let cursor: string | undefined
  do {
    const page = await service.list(cursor)
    for (const item of page.items) if (item.entry_type === FavoriteType.VOCABULARY) ids.add(item.id)
    cursor = page.next_cursor || undefined
    if (cursor && cursors.has(cursor)) throw new Error('收藏分页重复，请重试')
    if (cursor) cursors.add(cursor)
  } while (cursor)
  return ids.size
    ? `/sub-packages/favorites/review-front?cardIds=${encodeURIComponent([...ids].join(','))}&index=0&bank=VOCABULARY`
    : '/pages/favorites/index?tab=vocabulary'
}
