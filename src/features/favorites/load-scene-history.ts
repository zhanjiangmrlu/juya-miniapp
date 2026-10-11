import { ApiError } from '@/services/http/errors'

import type { FavoriteHistoryResponse, HistoryItem } from '@/shared/types/favorites'
import type { HttpClient } from '@/shared/types/http'

/** 读取全部场景历史，client为本人请求端口，isCurrent核对页面与身份；不提交部分分页结果 */
export const loadSceneHistory = async (client: HttpClient, isCurrent: () => boolean) => {
  const collected = new Map<string, HistoryItem>()
  const visited = new Set<string>()
  let cursor: string | null = null
  do {
    if (!isCurrent()) return undefined
    if (cursor && visited.has(cursor))
      throw new ApiError('CURSOR_INVALID', '历史分页位置已失效', 422)
    if (cursor) visited.add(cursor)
    const page: FavoriteHistoryResponse = await client.get<FavoriteHistoryResponse>(
      `/api/v1/history/scenes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    )
    if (!isCurrent()) return undefined
    for (const item of page.items)
      if (!collected.has(item.scene_id)) collected.set(item.scene_id, item)
    cursor = page.has_more ? page.next_cursor : null
    if (page.has_more && !cursor) throw new ApiError('CURSOR_INVALID', '历史分页位置已失效', 422)
  } while (cursor)
  return [...collected.values()]
}
