import { expect, it } from 'vitest'
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
