import { expect, it } from 'vitest'

import { dictionaryTokens } from '@/features/learning/scene-model'

it('keeps abbreviations contractions hyphens and UTF16 offsets intact while leaving punctuation and alphanumeric fragments inert', () => {
  const line = {
    id: 'line-1',
    speaker: 'A',
    english: '😀 U.S., e.g. Dr. Let’s try well-being today. abc123 abc_foo!',
    chinese: ''
  }
  const tokens = dictionaryTokens(line, [])
  expect(tokens.map((token) => token.text).join('')).toBe(line.english)
  expect(tokens.filter((token) => token.word).map((token) => token.text)).toEqual([
    'U.S.',
    'e.g.',
    'Dr.',
    'Let’s',
    'try',
    'well-being',
    'today'
  ])
  for (const token of tokens.filter((token) => token.word))
    expect(line.english.slice(token.start, token.end)).toBe(token.text)
  expect(tokens.find((token) => token.word)?.start).toBe(3)
})

it('retains exact highlight range and source color when every ordinary word becomes clickable', () => {
  const line = { id: 'line-1', speaker: 'A', english: 'Try indoor exercise today.', chinese: '' }
  const vocabulary = [
    {
      id: 'word',
      english: 'indoor exercise',
      meaning: '室内运动',
      phonetic: '',
      pronunciation_text: '',
      pronunciation_issue: false,
      source: { line_id: 'line-1', start: 4, end: 19, quote: 'indoor exercise' }
    }
  ]
  const tokens = dictionaryTokens(line, vocabulary)
  expect(
    tokens
      .filter((token) => token.highlight)
      .map((token) => token.text)
      .join('')
  ).toBe('indoor exercise')
  expect(tokens.filter((token) => token.word).map((token) => token.text)).toEqual([
    'Try',
    'indoor',
    'exercise',
    'today'
  ])
})

it('leaves Unicode case-folding lookalikes inert under the shared ASCII word boundary rule', () => {
  const line = { id: 'line-1', speaker: 'A', english: 'İ ı ſ K ASCII', chinese: '' }
  const tokens = dictionaryTokens(line, [])
  expect(tokens.map((token) => token.text).join('')).toBe(line.english)
  expect(tokens.filter((token) => token.word).map((token) => token.text)).toEqual(['ASCII'])
})
