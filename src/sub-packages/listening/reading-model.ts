import { LISTENING_TRAIL_MS, LISTENING_TRAIL_WORDS } from '@/shared/constants/listening'

import type {
  ListeningFrame,
  ListeningParagraph,
  ListeningProgress,
  ListeningReadingRect,
  ListeningToken,
  ListeningWord
} from '@/shared/types/listening'
/** 按原始媒体毫秒重建逐字符颜色，不用墙上时钟推进暂停尾迹
 * @param words 当前发布版本已校验词轴
 * @param milliseconds 原始媒体时钟毫秒
 * @param ended 媒体是否已播放完毕
 */
export const characterFrame = (
  words: ListeningWord[],
  milliseconds: number,
  ended: boolean
): ListeningFrame => {
  const frame: ListeningFrame = { current: -1, fraction: 0, trails: [] }
  if (ended || !words.length) return frame
  const index = words.findIndex(
    (word) => milliseconds >= word.start_ms && milliseconds < word.end_ms
  )
  const previous = words.reduce(
    (found, word, index) => (word.end_ms <= milliseconds ? index : found),
    -1
  )
  const anchor = index >= 0 ? index : previous
  const active = words[anchor]
  if (!active) return frame
  if (index >= 0) {
    const progress =
      ((milliseconds - active.start_ms) / (active.end_ms - active.start_ms)) *
      (active.end - active.start)
    frame.current = active.start + Math.floor(progress)
    frame.fraction = progress - Math.floor(progress)
  }
  for (let i = Math.max(0, anchor - LISTENING_TRAIL_WORDS + 1); i <= anchor; i++) {
    const word = words[i]!
    if (word.sentence_id !== active.sentence_id) continue
    for (let position = word.start; position < word.end; position++) {
      const end =
        word.start_ms +
        ((position - word.start + 1) / (word.end - word.start)) * (word.end_ms - word.start_ms)
      const age = milliseconds - end
      if (age >= 0 && age < LISTENING_TRAIL_MS)
        frame.trails.push({ position, strength: 1 - age / LISTENING_TRAIL_MS })
    }
  }
  return frame
}
/** 校验code point范围、时间先后和真实媒体时长，拒绝错误高亮
 * @param body 未插入缩进空格的服务端原文
 * @param words 当前正文音频绑定的词轴
 * @param durationMs 实际完整音频毫秒时长
 */
export const validateTimeline = (body: string, words: ListeningWord[], durationMs: number) => {
  if (!words.length || !Number.isFinite(durationMs) || durationMs <= 0) return false
  let textEnd = 0,
    timeEnd = 0
  return words.every((word) => {
    const valid =
      [word.start, word.end, word.start_ms, word.end_ms].every(Number.isFinite) &&
      Number.isInteger(word.start) &&
      Number.isInteger(word.end) &&
      word.start >= textEnd &&
      word.end > word.start &&
      word.end <= Array.from(body).length &&
      word.start_ms >= timeEnd &&
      word.end_ms > word.start_ms &&
      word.end_ms <= durationMs + 50 &&
      Boolean(word.sentence_id)
    textEnd = word.end
    timeEnd = word.end_ms
    return valid
  })
}
/** 将自然段拆成可点英文词，偏移始终按Unicode code point计算
 * @param body 未更改的英文正文
 */
export const tokenizeBody = (body: string): ListeningParagraph[] => {
  let offset = 0
  const parts = body.split(/(\r\n|\r|\n)/),
    paragraphs: ListeningParagraph[] = []
  for (let index = 0; index < parts.length; index += 2) {
    const text = parts[index]!,
      separator = parts[index + 1] || '',
      start = offset,
      tokens: ListeningToken[] = []
    if (!text && !separator) continue
    for (const match of text.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g)) {
      const length = Array.from(match[0]).length
      tokens.push({
        text: match[0],
        start: offset,
        end: offset + length,
        word: /^[A-Za-z]/.test(match[0])
      })
      offset += length
    }
    paragraphs.push({ tokens, separator, start })
    offset += Array.from(separator).length
  }
  return paragraphs
}
/** 按可见正文词定位阅读锚点，滚过正文后保留最后合法词的位置
 * @param words 按原文顺序排列的可点击英文词
 * @param rectangles 同序正文词的实时可视位置
 * @param headerBottom 固定页头下边界像素
 */
export const readingAnchor = (
  words: ListeningToken[],
  rectangles: ListeningReadingRect[],
  headerBottom: number
) => {
  const index = rectangles.findIndex((rect) => rect.bottom > headerBottom)
  return (index >= 0 ? words[index] : words.at(-1))?.start || 0
}
/** 只恢复同一已发布版本的服务端已保存进度
 * @param versionId 当前发布版本
 * @param progress 服务端进度或空记录
 */
export const restoreProgress = (
  versionId: string,
  progress: ListeningProgress | null
): ListeningProgress =>
  progress?.version_id === versionId
    ? { ...progress }
    : {
        version_id: versionId,
        reading_position: 0,
        translation_open: false,
        audio_position: 0,
        playback_rate: 1
      }
