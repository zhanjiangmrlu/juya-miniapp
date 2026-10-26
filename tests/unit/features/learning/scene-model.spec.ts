import { expect, it } from 'vitest'

it.each([
  [
    [3, 10],
    [7, 17]
  ],
  [
    [3, 10],
    [3, 17]
  ],
  [
    [3, 17],
    [7, 10]
  ],
  [
    [3, 17],
    [3, 17]
  ]
])('preserves the union of overlapping highlights and original UTF16 text', async (...ranges) => {
  const { highlightSegments } = await import('@/features/learning/scene-model')
  const english = '😀 tea and coffee.'
  const parts = highlightSegments(
    { id: 'one', speaker: 'A', english, chinese: '' },
    ranges.map(([start, end], index) => ({
      id: `word-${index}`,
      english: english.slice(start, end),
      meaning: '',
      phonetic: '',
      pronunciation_text: '',
      pronunciation_issue: false,
      source: { line_id: 'one', start: start!, end: end!, quote: english.slice(start, end) }
    }))
  )
  expect(parts.map((part) => part.text).join('')).toBe(english)
  expect(
    parts
      .filter((part) => part.highlight)
      .map((part) => part.text)
      .join('')
  ).toBe('tea and coffee')
})
it('highlights only a confirmed source range, including UTF-16 emoji offsets', async () => {
  const { highlightSegments } = await import('@/features/learning/scene-model')
  const parts = highlightSegments(
    { id: 'one', speaker: 'A', english: '😀 tea and tea', chinese: '茶' },
    [
      {
        id: 'word',
        english: 'tea',
        meaning: '茶',
        phonetic: '',
        pronunciation_text: '',
        pronunciation_issue: false,
        source: { line_id: 'one', start: 11, end: 14, quote: 'tea' }
      }
    ]
  )
  expect(parts).toEqual([
    { text: '😀 tea and ', highlight: false },
    { text: 'tea', highlight: true },
    { text: '', highlight: false }
  ])
})
