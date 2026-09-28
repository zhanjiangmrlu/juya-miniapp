import type { HttpClient } from '@/services/http/client'
import type { FavoriteItem, FavoritePage, ReviewSession } from '@/shared/contracts/favorites'

export interface FavoriteService {
  completeReview(reviewId: string, idempotencyKey: string): Promise<void>
  createReview(cardIds: string[]): Promise<ReviewSession>
  get(id: string): Promise<FavoriteItem>
  list(cursor?: string): Promise<FavoritePage>
  remove(id: string): Promise<void>
}

/** 创建收藏与复习服务，游标和标识均经过安全编码。 */
export function createFavoriteService(client: HttpClient): FavoriteService {
  return {
    completeReview: async (reviewId, idempotencyKey) => {
      await client.post(`/api/v1/reviews/${encodeURIComponent(reviewId)}/complete`, undefined, {
        idempotencyKey
      })
    },
    createReview: (cardIds) => client.post('/api/v1/reviews', { card_ids: cardIds }),
    get: (id) => client.get(`/api/v1/favorites/${encodeURIComponent(id)}`),
    list: (cursor) =>
      client.get(
        `/api/v1/favorites?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      ),
    remove: async (id) => {
      await client.delete(`/api/v1/favorites/${encodeURIComponent(id)}`)
    }
  }
}
