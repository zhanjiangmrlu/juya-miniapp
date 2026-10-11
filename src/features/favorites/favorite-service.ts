import { adaptFavoriteSnapshot } from '@/features/favorites/favorite-snapshot-response'

import type { FavoriteItem, FavoritePage, FavoriteSnapshot } from '@/shared/contracts/favorites'
import type { FavoriteService } from '@/shared/types/favorites'
import type { HttpClient } from '@/shared/types/http'

export type { FavoriteService } from '@/shared/types/favorites'

/** 创建收藏与复习服务，client 为统一认证客户端 */
export const createFavoriteService = (client: HttpClient): FavoriteService => {
  return {
    /** 保存确认资料引用，reference 为本篇稳定目标，idempotencyKey 为同次重试键 */
    create: async (reference, idempotencyKey) =>
      adaptFavoriteSnapshot(
        await client.post<FavoriteSnapshot>('/api/v1/favorite-snapshots', reference, {
          idempotencyKey
        })
      ),
    /** 完成复习，reviewId 为服务端会话标识，idempotencyKey 为本次固定重试键 */
    completeReview: async (reviewId, idempotencyKey) => {
      await client.post(`/api/v1/reviews/${encodeURIComponent(reviewId)}/complete`, undefined, {
        idempotencyKey
      })
    },
    /** 创建翻卡队列，cardIds 为全部收藏标识，idempotencyKey 为本次队列固定键 */
    createReview: (cardIds, idempotencyKey) =>
      client.post('/api/v1/reviews', { card_ids: cardIds, snapshot_schema: 2 }, { idempotencyKey }),
    /** 获取完整收藏，id 为收藏标识 */
    get: async (id) =>
      adaptFavoriteSnapshot(
        await client.get<FavoriteSnapshot>(`/api/v1/favorite-snapshots/${encodeURIComponent(id)}`)
      ),
    /** 分页读取收藏，cursor 为服务端下一页游标 */
    list: async (cursor) => {
      const page = await client.get<
        Omit<FavoritePage, 'items'> & { items: (FavoriteSnapshot | FavoriteItem)[] }
      >(
        `/api/v1/favorite-snapshots?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      )
      return { ...page, items: page.items.map(adaptFavoriteSnapshot) }
    },
    /** 取消收藏，id 为待移除收藏标识，idempotencyKey 为本次固定重试键 */
    remove: (id, idempotencyKey) =>
      client.delete(`/api/v1/favorite-snapshots/${encodeURIComponent(id)}`, undefined, {
        idempotencyKey
      }),
    /** 重新校验当前原文权限并解析位置，id 为本人收藏标识 */
    resolveSource: (id) =>
      client.get(`/api/v1/favorite-snapshots/${encodeURIComponent(id)}/source-resolution`)
  }
}
