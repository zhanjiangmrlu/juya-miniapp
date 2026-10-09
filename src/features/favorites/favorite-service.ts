import { adaptFavoriteItem } from '@/services/favorite-response'

import type { FavoriteItem, FavoritePage } from '@/shared/contracts/favorites'
import type { FavoriteService } from '@/shared/types/favorites'
import type { HttpClient } from '@/shared/types/http'

export type { FavoriteService } from '@/shared/types/favorites'

/** 创建收藏与复习服务，client 为统一认证客户端 */
export const createFavoriteService = (client: HttpClient): FavoriteService => {
  return {
    /** 完成复习，reviewId 为服务端会话标识，idempotencyKey 为本次固定重试键 */
    completeReview: async (reviewId, idempotencyKey) => {
      await client.post(`/api/v1/reviews/${encodeURIComponent(reviewId)}/complete`, undefined, {
        idempotencyKey
      })
    },
    /** 创建翻卡队列，cardIds 为全部收藏标识，idempotencyKey 为本次队列固定键 */
    createReview: (cardIds, idempotencyKey) =>
      client.post('/api/v1/reviews', { card_ids: cardIds }, { idempotencyKey }),
    /** 获取完整收藏，id 为收藏标识 */
    get: async (id) =>
      adaptFavoriteItem(
        await client.get<FavoriteItem>(`/api/v1/favorites/${encodeURIComponent(id)}`)
      ),
    /** 分页读取收藏，cursor 为服务端下一页游标 */
    list: async (cursor) => {
      const page = await client.get<FavoritePage>(
        `/api/v1/favorites?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      )
      return { ...page, items: page.items.map(adaptFavoriteItem) }
    },
    /** 取消收藏，id 为待移除收藏标识 */
    remove: async (id) => {
      await client.delete(`/api/v1/favorites/${encodeURIComponent(id)}`)
    }
  }
}
