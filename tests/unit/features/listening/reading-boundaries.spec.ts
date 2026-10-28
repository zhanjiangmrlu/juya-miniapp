import { expect, it } from 'vitest'

import { characterFrame, tokenizeBody } from '@/features/listening/reading-model'
it('caps the visible trail to two recent words even during rapid short words', () => {
  const words = [
    { start: 0, end: 1, start_ms: 0, end_ms: 50, sentence_id: 's' },
    { start: 2, end: 3, start_ms: 50, end_ms: 100, sentence_id: 's' },
    { start: 4, end: 5, start_ms: 100, end_ms: 150, sentence_id: 's' }
  ]
  const positions = characterFrame(words, 140, false).trails.map((item) => item.position)
  expect(positions).not.toContain(0)
  expect(positions).toContain(2)
})
it.each(['🌱 one\ntwo', '🌱 one\r\ntwo', '🌱 one\n\n\nthree', '🌱 one\r\n\r\nthree'])(
  'keeps original separators and code point offsets for %j',
  (body) => {
    const paragraphs = tokenizeBody(body)
    expect(
      paragraphs
        .map(
          (paragraph) => paragraph.tokens.map((token) => token.text).join('') + paragraph.separator
        )
        .join('')
    ).toBe(body)
    const lastWord = paragraphs
      .flatMap((paragraph) => paragraph.tokens)
      .filter((token) => token.word)
      .at(-1)!
    const points = Array.from(body)
    expect(points.slice(lastWord.start, lastWord.end).join('')).toBe(lastWord.text)
    expect(lastWord.start).toBe(points.length - Array.from(lastWord.text).length)
  }
)
