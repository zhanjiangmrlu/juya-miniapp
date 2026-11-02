import { expect, it } from 'vitest'

import { vocabularyHighlights } from '@/features/listening/vocabulary-highlights'
const body = '🌱 He goes. She goes.'
const source = {
  start: 11,
  end: 20,
  quote: 'She goes.',
  word_start: 15,
  word_end: 19,
  word: 'goes',
  confirmed: true
}
it('highlights only the saved inflected occurrence using Unicode code points', () => {
  expect(vocabularyHighlights(body, [{ source }])).toEqual([
    { start: 15, end: 19, color: '#e4efd6' }
  ])
})
it('retains distinct sources for independent senses of the same spelling', () => {
  expect(
    vocabularyHighlights(body, [
      { source },
      { source: { ...source, start: 2, end: 10, quote: 'He goes.', word_start: 5, word_end: 9 } }
    ])
  ).toEqual([
    { start: 15, end: 19, color: '#e4efd6' },
    { start: 5, end: 9, color: '#e2edf2' }
  ])
})

it('cycles distinct colors across saved words without changing Unicode positions', () => {
  const text = '🌱 car police bus train taxi.'
  const words = [
    { word: 'car', word_start: 2, word_end: 5 },
    { word: 'police', word_start: 6, word_end: 12 },
    { word: 'bus', word_start: 13, word_end: 16 },
    { word: 'train', word_start: 17, word_end: 22 },
    { word: 'taxi', word_start: 23, word_end: 27 }
  ].map((word) => ({ source: { ...word, start: 0, end: 28, quote: text, confirmed: true } }))
  expect(vocabularyHighlights(text, words)).toEqual([
    { start: 2, end: 5, color: '#e4efd6' },
    { start: 6, end: 12, color: '#e2edf2' },
    { start: 13, end: 16, color: '#f7e6d6' },
    { start: 17, end: 22, color: '#f6efc9' },
    { start: 23, end: 27, color: '#e4efd6' }
  ])
})
it('skips missing, stale and malformed sources without searching another occurrence', () => {
  for (const value of [
    null,
    { ...source, quote: 'He goes.' },
    { ...source, word: 'go' },
    { ...source, word_end: 22 },
    { ...source, word_start: 15.5 },
    { ...source, word_start: 16, word: 'oes' }
  ]) {
    expect(vocabularyHighlights(body, [{ source: value }])).toEqual([])
  }
})

it('accepts quoted words while rejecting partial contractions and hyphenated words', () => {
  expect(
    vocabularyHighlights("'goes'", [
      {
        source: {
          start: 0,
          end: 6,
          quote: "'goes'",
          word_start: 1,
          word_end: 5,
          word: 'goes',
          confirmed: true
        }
      }
    ])
  ).toEqual([{ start: 1, end: 5, color: '#e4efd6' }])
  expect(
    vocabularyHighlights("can't", [
      {
        source: {
          start: 0,
          end: 5,
          quote: "can't",
          word_start: 0,
          word_end: 3,
          word: 'can',
          confirmed: true
        }
      }
    ])
  ).toEqual([])
})
