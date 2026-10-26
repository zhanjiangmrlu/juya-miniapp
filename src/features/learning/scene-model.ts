import { DICTIONARY_TOKEN_PATTERN } from '@/shared/constants/dictionary'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { DictionaryToken } from '@/shared/types/dictionary'

/** 按词汇顺序保留本句有效来源，顺序决定重叠区域颜色
 * @param line 当前对话原文
 * @param words 当前发布版本词汇
 */
const confirmedSources = (
  line: components['schemas']['Dialogue'],
  words: components['schemas']['Vocabulary'][]
) =>
  words.flatMap((word, colorIndex) => {
    const source = word.source
    return source &&
      source.line_id === line.id &&
      source.start >= 0 &&
      source.end > source.start &&
      source.end <= line.english.length &&
      Boolean(source.quote) &&
      line.english.slice(source.start, source.end) === source.quote
      ? [{ ...source, colorIndex }]
      : []
  })

/** 对已确认的原句片段高亮，不解析英文中的任何HTML
 * @param line 当前中英文对话行
 * @param words 当前发布版本的本句词汇
 */
export const highlightSegments = (
  line: components['schemas']['Dialogue'],
  words: components['schemas']['Vocabulary'][]
) => {
  const sources = confirmedSources(line, words).sort((a, b) => a.start - b.start)
  const ranges: { start: number; end: number }[] = []
  for (const source of sources) {
    const previous = ranges.at(-1)
    if (previous && source.start <= previous.end) previous.end = Math.max(previous.end, source.end)
    else ranges.push({ start: source.start, end: source.end })
  }
  const parts: { text: string; highlight: boolean }[] = []
  let cursor = 0
  for (const source of ranges) {
    parts.push(
      { text: line.english.slice(cursor, source.start), highlight: false },
      { text: line.english.slice(source.start, source.end), highlight: true }
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
  const sources = confirmedSources(line, words)
  const parts: DictionaryToken[] = []
  /** 加入原样片段，只有完整英文词允许提交查询
   * @param start 本片段UTF16起点
   * @param end 本片段UTF16排他终点
   * @param word 本片段是否为完整可查英文词
   */
  const append = (start: number, end: number, word: boolean) => {
    if (start === end) return
    const boundaries = [
      ...new Set([
        start,
        end,
        ...sources.flatMap((source) =>
          [source.start, source.end].filter((offset) => offset > start && offset < end)
        )
      ])
    ].sort((a, b) => a - b)
    for (let index = 0; index < boundaries.length - 1; index++) {
      const fragmentStart = boundaries[index]!,
        fragmentEnd = boundaries[index + 1]!
      const source = sources.find(
        (value) => value.start <= fragmentStart && value.end >= fragmentEnd
      )
      parts.push({
        text: line.english.slice(fragmentStart, fragmentEnd),
        word: word && Boolean(line.id),
        start: fragmentStart,
        end: fragmentEnd,
        line_id: line.id || '',
        highlight: Boolean(source),
        colorIndex: source?.colorIndex ?? 0,
        ...(word && (fragmentStart !== start || fragmentEnd !== end)
          ? { lookup: { word: line.english.slice(start, end), start, end } }
          : {})
      })
    }
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
