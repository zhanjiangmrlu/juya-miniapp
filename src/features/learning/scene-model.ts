import type { components } from '@/shared/contracts/generated/mini-api'

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
