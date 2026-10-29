import { expect, it } from 'vitest'

import {
  listeningResumeText,
  listeningSourceSentence,
  listeningTimestamp
} from '@/features/listening/listening-presenter'

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

it('finds the actual source sentence by code point offsets and never substitutes example content', () => {
  expect(listeningSourceSentence('A first sentence.\n😀 Try this word! Another.', 24, 28)).toBe(
    '😀 Try this word!'
  )
  expect(listeningSourceSentence('Only one line', 5, 8)).toBe('Only one line')
  expect(listeningSourceSentence('Only one line', 99, 101)).toBe('')
})

it('uses only server-confirmed resume locations and treats reset progress as starting over', () => {
  expect(listeningResumeText({ progress: { reading_position: 20 }, reading_paragraph: 2 })).toBe(
    '上次读到第2段'
  )
  expect(listeningResumeText({ progress: { reading_position: 20 } })).toBe('上次读到第21个字符')
  expect(listeningResumeText({ progress: { reading_position: 0 } })).toBe('从头开始阅读')
  expect(listeningResumeText({ progress: null })).toBe('')
})
