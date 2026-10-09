import { describe, expect, it, vi } from 'vitest'

import { loadFavoriteGroup } from '@/features/favorites/load-favorite-group'

import type { FavoriteService } from '@/features/favorites/favorite-service'
import type { FavoriteItem } from '@/shared/contracts/favorites'

/** 构建同词不同来源收藏，id 为收藏及稳定词条标识 */
const favorite = (id: string): FavoriteItem => ({
  id,
  entry_stable_id: id,
  entry_type: 'VOCABULARY',
  normalized_key: 'latte',
  favorited_at: '',
  last_reviewed_at: null,
  sources: [
    {
      scene_id: id,
      source_locator: 's1',
      revision_id: 'r1',
      entry_version: 2,
      original_link: '/source',
      sentence_snapshot: id
    }
  ]
})
describe('收藏详情完整来源', () => {
  it('跨全部分页读取同展示键最新详情，同时保留各来源权限和稳定词条标识', async () => {
    const first = favorite('one'),
      second = favorite('two')
    const denied = {
      ...second,
      sources: second.sources.map((source) => ({ ...source, original_link: null }))
    }
    const get = vi.fn(async (id: string) => (id === 'one' ? first : denied))
    const list = vi.fn(async (cursor?: string) => ({
      items: cursor
        ? [first, second, { ...favorite('phrase'), entry_type: 'PHRASE' as const }]
        : [first],
      has_more: !cursor,
      next_cursor: cursor ? null : 'next'
    }))
    const result = await loadFavoriteGroup({ get, list } as unknown as FavoriteService, 'one')
    expect(result.group?.items.map((item) => item.id)).toEqual(['one', 'two'])
    expect(result.group?.sources).toHaveLength(2)
    expect(result.group?.sources[0]?.returnUrl).toContain('entryId=one')
    expect(result.group?.sources[1]?.returnUrl).toBeNull()
    expect(get.mock.calls.flat()).toEqual(['one', 'two'])
    expect(list).toHaveBeenCalledWith('next')
  })
})
