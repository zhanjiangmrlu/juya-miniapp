import { expect, it } from 'vitest'

import { listeningTimestamp } from '@/features/listening/listening-presenter'

import type { ListeningSummary } from '@/shared/types/listening'
it('formats the exact favorite or daily acceptance time in Beijing without substituting another event', () => {
  const article = {
    favorited_at: '2026-10-28T17:30:00Z',
    completed_at: '2026-10-29T00:01:00Z',
    last_completed_at: '2026-10-29T03:00:00Z'
  } as ListeningSummary
  expect(listeningTimestamp(article, 'favorite')).toBe('2026-10-29 01:30 · 收藏')
  expect(listeningTimestamp(article, 'daily')).toBe('2026-10-29 08:01 · 当日学习')
  expect(listeningTimestamp({ ...article, completed_at: null }, 'daily')).toBe('')
})
