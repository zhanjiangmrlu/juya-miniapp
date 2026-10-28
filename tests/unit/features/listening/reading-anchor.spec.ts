import { expect, it } from 'vitest'

import { readingAnchor, tokenizeBody } from '@/features/listening/reading-model'
it('uses a legal last body word anchor when the viewport scrolls beyond the body into expressions and completion', () => {
  const words = tokenizeBody('First paragraph.\nLast paragraph.')
    .flatMap((paragraph) => paragraph.tokens)
    .filter((token) => token.word)
  expect(
    readingAnchor(
      words,
      words.map(() => ({ top: -300, bottom: -250 })),
      110
    )
  ).toBe(words.at(-1)!.start)
  expect(
    readingAnchor(
      words,
      words.map((_, index) => ({ top: 60 + index * 80, bottom: 100 + index * 80 })),
      110
    )
  ).toBe(words[1]!.start)
})
