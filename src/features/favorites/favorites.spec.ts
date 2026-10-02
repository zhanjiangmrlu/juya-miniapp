import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFavoriteStore } from '@/stores/favorites'

import type { FavoriteItem } from '@/shared/contracts/favorites'

import { presentFavorites } from './favorite-presenter'
import { createReviewSession } from './review-session'

/** 创建收藏条目测试数据，保留业务相关字段而省略无关差异 */
const favorite = (
  overrides: Partial<FavoriteItem> & Pick<FavoriteItem, 'id' | 'normalized_key'>
) => {
  return {
    entry_stable_id: overrides.id,
    entry_type: 'VOCABULARY',
    favorited_at: '2026-09-28T00:00:00Z',
    last_reviewed_at: null,
    sources: [],
    ...overrides
  } satisfies FavoriteItem
}

beforeEach(() => setActivePinia(createPinia()))

describe('favorite store', () => {
  it('翻卡数据遍历全部游标页，超过十张不截断并按标识去重', async () => {
    const store = useFavoriteStore()
    const page = Array.from({ length: 24 }, (_, index) =>
      favorite({ id: `card-${index}`, normalized_key: `word-${index}` })
    )
    await store.load(
      {
        list: async (cursor?: string) => ({
          items: cursor ? page.slice(11) : page.slice(0, 12),
          next_cursor: cursor ? null : 'second',
          has_more: !cursor
        })
      } as Parameters<typeof store.load>[0],
      true
    )
    expect(store.visibleGroups).toHaveLength(24)
    expect(new Set(store.items.map((item) => item.id)).size).toBe(24)
  })
  it('词汇与语块分别保留筛选、滚动位置和游标', () => {
    const store = useFavoriteStore()
    store.updateTabState('VOCABULARY', { cursor: 'word-next', filter: 'food', scrollTop: 120 })
    store.updateTabState('PHRASE', { cursor: 'phrase-next', filter: 'travel', scrollTop: 360 })

    expect(store.tabState.VOCABULARY).toEqual({
      cursor: 'word-next',
      filter: 'food',
      scrollTop: 120
    })
    expect(store.tabState.PHRASE).toEqual({
      cursor: 'phrase-next',
      filter: 'travel',
      scrollTop: 360
    })
  })
})

describe('presentFavorites', () => {
  it('返回原文保留收藏的修订号与条目版本，避免跳到新版错误位置', () => {
    const [group] = presentFavorites([
      favorite({
        id: 'fixed',
        normalized_key: 'coffee',
        sources: [
          {
            scene_id: 'cafe',
            source_locator: 'sentence-2',
            original_link: '/original',
            sentence_snapshot: 'coffee',
            revision_id: 'r-8',
            entry_version: 3
          }
        ]
      })
    ])
    expect(group.sources[0]?.returnUrl).toBe(
      '/pages/scene/return-source?sceneId=cafe&sourceLocator=sentence-2&revisionId=r-8&entryVersion=3&entryId=fixed'
    )
  })
  it('大小写与多余空格仅用于展示合并，不合并不同词形', () => {
    const groups = presentFavorites([
      favorite({ id: '1', normalized_key: ' Put   Together ' }),
      favorite({ id: '2', normalized_key: 'put together' }),
      favorite({ id: '3', normalized_key: 'evolves' }),
      favorite({ id: '4', normalized_key: 'evolved' })
    ])

    expect(groups.map((group) => [group.displayKey, group.items.length])).toEqual([
      ['put together', 2],
      ['evolves', 1],
      ['evolved', 1]
    ])
  })

  it('保留所有来源，且无权限来源不生成返回原文入口', () => {
    const [group] = presentFavorites([
      favorite({
        id: '1',
        normalized_key: 'evolved',
        sources: [
          {
            original_link: '/scenes/one#sentence-1',
            scene_id: 'one',
            sentence_snapshot: 'source one',
            source_locator: 'sentence-1'
          },
          {
            original_link: null,
            scene_id: 'two',
            sentence_snapshot: 'source two',
            source_locator: 'sentence-2'
          }
        ]
      })
    ])

    expect(group.sources).toHaveLength(2)
    expect(group.sources.map((source) => source.returnUrl)).toEqual([
      '/pages/scene/return-source?sceneId=one&sourceLocator=sentence-1',
      null
    ])
  })
})

describe('review session', () => {
  it('播放音频不触发翻面', () => {
    const session = createReviewSession(['card-1'])
    session.playAudio()

    expect(session.snapshot.face).toBe('FRONT')
    session.flip()
    expect(session.snapshot.face).toBe('BACK')
  })

  it('完成复习失败后重试复用同一幂等键', async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined)
    const session = createReviewSession(['card-1'], { idFactory: () => 'review-key' })

    await expect(session.complete(complete)).rejects.toThrow('offline')
    await session.complete(complete)

    expect(complete.mock.calls.map((call) => call[0])).toEqual(['review-key', 'review-key'])
  })
})
