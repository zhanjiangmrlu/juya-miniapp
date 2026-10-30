import { expect, it } from 'vitest'

import { phraseHighlights } from '@/features/listening/phrase-highlights'
it('matches literal phrases with Unicode offsets, whitespace and word boundaries, preferring longer overlap', () => {
  const body = '🌱 A DAY in real life. Holiday. a day\nin real life. C++ works.'
  const ranges = phraseHighlights(body, ['day', 'a day in real life', 'C++'])
  expect(ranges).toEqual([
    { start: 2, end: 20, color: '#e2edf2' },
    { start: 31, end: 49, color: '#e2edf2' },
    { start: 51, end: 54, color: '#f7e6d6' }
  ])
  expect(body).toContain('🌱 A DAY')
})
it('cycles the four design colors and ignores empty expressions', () => {
  expect(
    phraseHighlights('one two three four five', ['one', 'two', 'three', 'four', 'five']).map(
      (r) => r.color
    )
  ).toEqual(['#e4efd6', '#e2edf2', '#f7e6d6', '#f6efc9', '#e4efd6'])
  expect(phraseHighlights('text', ['', ' '])).toEqual([])
})
