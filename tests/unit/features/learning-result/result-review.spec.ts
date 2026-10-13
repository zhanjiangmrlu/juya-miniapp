import { describe, expect, it, vi } from 'vitest'

import { getResultReviewRoute } from '@/features/learning-result/result-review'

describe('学习成果复习入口', () => {
  it('遍历全部收藏页后将有效词汇和语块 ID 交给现有复习页', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          { id: 'word-1', entry_type: 'VOCABULARY' },
          { id: 'chunk', entry_type: 'PHRASE' },
          { id: 'removed', entry_type: 'PHRASE', active: false }
        ],
        next_cursor: 'page-2'
      })
      .mockResolvedValueOnce({
        items: [{ id: 'word-2', entry_type: 'VOCABULARY' }],
        next_cursor: null
      })
    expect(await getResultReviewRoute({ list })).toBe(
      '/sub-packages/favorites/review-front?cardIds=word-1%2Cchunk%2Cword-2&index=0&bank=VOCABULARY&scope=ALL'
    )
    expect(list).toHaveBeenLastCalledWith('page-2')
  })
  it('仅收藏语块时仍进入有效复习队列', async () => {
    expect(
      await getResultReviewRoute({
        list: vi.fn(async () => ({
          items: [{ id: 'phrase', entry_type: 'PHRASE', active: true }],
          next_cursor: null,
          has_more: false
        })) as never
      })
    ).toContain('cardIds=phrase')
  })
  it('没有词汇收藏时显示收藏入口而不创建空复习', async () => {
    expect(
      await getResultReviewRoute({
        list: vi.fn(async () => ({ items: [], next_cursor: null, has_more: false }))
      })
    ).toBe('/pages/favorites/index?tab=vocabulary')
  })
})
