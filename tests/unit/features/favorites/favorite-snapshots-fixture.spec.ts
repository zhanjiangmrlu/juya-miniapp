import { describe, expect, it } from 'vitest'

import { createFavoriteSnapshotMock } from '@/services/mock/favorite-snapshots-fixture'

import type { FavoriteSnapshot } from '@/shared/contracts/favorites'
import type { TransportRequest } from '@/shared/types/http'

/** 构造隔离预览请求，path 为接口路径，method 为方法，body 为稳定引用载荷 */
const request = (
  path: string,
  method: TransportRequest['method'] = 'GET',
  body?: unknown
): TransportRequest => ({
  method,
  url: `http://mock.local/api/v1${path}`,
  body,
  headers: { 'Idempotency-Key': 'fixture-key' },
  timeout: 1000
})

describe('V1.5 收藏隔离演示契约', () => {
  it('独立分页完整卡可取消并重新收藏，不接受客户端伪造释义', () => {
    const mock = createFavoriteSnapshotMock()
    const first = mock.handle(request('/favorite-snapshots?limit=2')) as {
      items: FavoriteSnapshot[]
      next_cursor: string
    }
    expect(first.items).toHaveLength(2)
    expect(first.next_cursor).toBeTruthy()
    const selected = first.items[0]!
    expect(
      mock.handle(request(`/favorite-snapshots/${selected.favorite_id}`, 'DELETE'))
    ).toMatchObject({ active: false })
    const repeated = mock.handle(request(`/favorite-snapshots/${selected.favorite_id}`, 'DELETE'))
    expect(repeated).toMatchObject({ active: false })
    const reference = {
      content_type: selected.content_type,
      content_id: selected.content_id,
      content_version: selected.saved_content_version,
      entry_id: selected.entry_id,
      sense_id: selected.sense_id,
      source_id: selected.source_id
    }
    const restored = mock.handle(
      request('/favorite-snapshots', 'POST', reference)
    ) as FavoriteSnapshot
    expect(restored.favorite_id).toBe(selected.favorite_id)
    expect(restored.active).toBe(true)
    expect(restored.english).toBe(selected.english)
    expect(() =>
      mock.handle({
        ...request('/favorite-snapshots', 'POST', { ...reference, meaning_zh: '伪造' }),
        headers: { 'Idempotency-Key': 'forged' }
      })
    ).toThrow()
  })
  it('schema2复习队列直接返回完整快照且同英文不同义项保持独立', () => {
    const mock = createFavoriteSnapshotMock()
    const queue = mock.handle(request('/reviews/queue?snapshot_schema=2&limit=100')) as {
      items: FavoriteSnapshot[]
    }
    const medium = queue.items.filter((item) => item.english === 'medium')
    expect(medium).toHaveLength(2)
    expect(new Set(medium.map((item) => item.meaning_zh)).size).toBe(2)
    const review = mock.handle(
      request('/reviews', 'POST', {
        snapshot_schema: 2,
        card_ids: queue.items.map((item) => item.favorite_id)
      })
    ) as { card_count: number; cards: FavoriteSnapshot[] }
    expect(review.card_count).toBe(queue.items.length)
    expect(review.cards[0]?.source_sentence).toBeTruthy()
  })
})
