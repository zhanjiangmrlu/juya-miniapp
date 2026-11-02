import { LISTENING_VOCABULARY_COLOR } from '@/shared/constants/listening'

import type { ListeningVocabulary, PhraseHighlight } from '@/shared/types/listening'
/** 只高亮当前正文中已保存的词汇来源，不猜测重复词或失效位置
 * @param body 当前发布版本的英文正文
 * @param words 已保存的词条及独立原句来源
 * @returns 通过码点和原文校验的词汇色带
 */
export const vocabularyHighlights = (
  body: string,
  words: Pick<ListeningVocabulary, 'source'>[]
): PhraseHighlight[] => {
  const chars = Array.from(body)
  const tokens = new Set(
    [...body.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*/gu)].map((match) => {
      const start = Array.from(body.slice(0, match.index)).length
      return `${start}:${start + Array.from(match[0]).length}`
    })
  )
  return words.flatMap(({ source }) => {
    if (!source) return []
    const { start, end, word_start: wordStart, word_end: wordEnd, quote, word } = source
    if (
      ![start, end, wordStart, wordEnd].every(Number.isInteger) ||
      start < 0 ||
      end > chars.length ||
      end <= start ||
      wordStart < start ||
      wordEnd > end ||
      wordEnd <= wordStart ||
      chars.slice(start, end).join('') !== quote ||
      chars.slice(wordStart, wordEnd).join('') !== word ||
      !tokens.has(`${wordStart}:${wordEnd}`)
    )
      return []
    return [{ start: wordStart, end: wordEnd, color: LISTENING_VOCABULARY_COLOR }]
  })
}
