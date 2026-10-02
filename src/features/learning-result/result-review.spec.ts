import { describe, expect, it, vi } from 'vitest'

import { getResultReviewRoute } from './result-review'

describe('学习成果复习入口', () => {
  it('遍历全部收藏页后将词汇 ID 交给现有复习页', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          { id: 'word-1', entry_type: 'VOCABULARY' },
          { id: 'chunk', entry_type: 'PHRASE' }
        ],
        next_cursor: 'page-2'
      })
      .mockResolvedValueOnce({
        items: [{ id: 'word-2', entry_type: 'VOCABULARY' }],
        next_cursor: null
      })
    expect(await getResultReviewRoute({ list })).toBe(
      '/pages/favorites/review-front?cardIds=word-1%2Cword-2&index=0&bank=VOCABULARY'
    )
    expect(list).toHaveBeenLastCalledWith('page-2')
  })
  it('没有词汇收藏时显示收藏入口而不创建空复习', async () => {
    expect(
      await getResultReviewRoute({
        list: vi.fn(async () => ({ items: [], next_cursor: null, has_more: false }))
      })
    ).toBe('/pages/favorites/index?tab=vocabulary')
  })
})
