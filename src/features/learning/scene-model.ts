import { DICTIONARY_TOKEN_PATTERN } from '@/shared/constants/dictionary'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { DictionaryToken } from '@/shared/types/dictionary'

/** 对已确认的原句片段高亮，不解析英文中的任何HTML
 * @param line 当前中英文对话行
 * @param words 当前发布版本的本句词汇
 */
export const highlightSegments = (
  line: components['schemas']['Dialogue'],
  words: components['schemas']['Vocabulary'][]
) => {
  const sources = words
    .map((word) => word.source)
    .filter(
      (source) =>
        source &&
        source.line_id === line.id &&
        line.english.slice(source.start, source.end) === source.quote
    )
    .sort((a, b) => a!.start - b!.start)
  const parts: { text: string; highlight: boolean }[] = []
  let cursor = 0
  for (const source of sources) {
    if (!source || source.start < cursor) continue
    parts.push(
      { text: line.english.slice(cursor, source.start), highlight: false },
      { text: source.quote, highlight: true }
    )
    cursor = source.end
  }
  parts.push({ text: line.english.slice(cursor), highlight: false })
  return parts
}

/** 格式化完整音频的实际秒数
 * @param seconds 音频位置或时长
 */
export const audioTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

/** 为所有正文英文词保留精确UTF16范围，高亮仅复用已确认来源
 * @param line 当前发布版本的对话行
 * @param words 当前版本的本句词汇来源
 */
export const dictionaryTokens = (
  line: components['schemas']['Dialogue'],
  words: components['schemas']['Vocabulary'][]
): DictionaryToken[] => {
  const sources = words
    .flatMap((word, colorIndex) =>
      word.source &&
      word.source.line_id === line.id &&
      line.english.slice(word.source.start, word.source.end) === word.source.quote
        ? [{ ...word.source, colorIndex }]
        : []
    )
    .sort((a, b) => a.start - b.start)
  const parts: DictionaryToken[] = []
  /** 加入原样片段，只有完整英文词允许提交查询
   * @param start 本片段UTF16起点
   * @param end 本片段UTF16排他终点
   * @param word 本片段是否为完整可查英文词
   */
  const append = (start: number, end: number, word: boolean) => {
    if (start === end) return
    const source = sources.find((value) => value.start <= start && value.end >= end)
    parts.push({
      text: line.english.slice(start, end),
      word: word && Boolean(line.id),
      start,
      end,
      line_id: line.id || '',
      highlight: Boolean(source),
      colorIndex: source?.colorIndex ?? 0
    })
  }
  let cursor = 0
  for (const match of line.english.matchAll(new RegExp(DICTIONARY_TOKEN_PATTERN, 'gi'))) {
    const start = match.index!,
      end = start + match[0].length
    if (
      /[A-Za-z0-9_]/.test(line.english[start - 1] || '') ||
      /[A-Za-z0-9_]/.test(line.english[end] || '')
    )
      continue
    append(cursor, start, false)
    append(start, end, true)
    cursor = end
  }
  append(cursor, line.english.length, false)
  return parts
}
/** 按原高亮范围组合相邻词元，避免逐词高亮增加原文间距
 * @param tokens 已保留原始位置的连续对话词元
 */
export const dictionaryGroups = (tokens: DictionaryToken[]) => {
  const groups: { highlight: boolean; colorIndex: number; tokens: DictionaryToken[] }[] = []
  for (const token of tokens) {
    const previous = groups.at(-1)
    if (
      previous &&
      previous.highlight === token.highlight &&
      previous.colorIndex === token.colorIndex
    )
      previous.tokens.push(token)
    else groups.push({ highlight: token.highlight, colorIndex: token.colorIndex, tokens: [token] })
  }
  return groups
}
