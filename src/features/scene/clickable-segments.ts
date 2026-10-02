import type { ClickableSpan, SceneEntry } from '@/shared/contracts/learning'

export interface ClickableSegment {
  text: string
  span?: ClickableSpan
}

/** 切分服务端点击片段，text 为当前句正文，spans 为字符区间，entries 为词条类型目录 */
export const createClickableSegments = (
  text: string,
  spans: ClickableSpan[],
  entries: SceneEntry[]
): ClickableSegment[] => {
  const points = [...text]
  /** 语块优先于重叠词汇，span 为当前候选点击区间 */
  const priority = (span: ClickableSpan) =>
    entries.find((entry) => entry.entry_id === span.entry_id)?.entry_type === 'PHRASE' ? 0 : 1
  const valid = spans
    .filter(
      (span) =>
        Number.isInteger(span.start) &&
        Number.isInteger(span.end) &&
        span.start >= 0 &&
        span.end > span.start &&
        span.end <= points.length
    )
    .sort(
      (left, right) =>
        priority(left) - priority(right) || right.end - right.start - (left.end - left.start)
    )
  const selected: ClickableSpan[] = []
  for (const span of valid) {
    if (!selected.some((other) => span.start < other.end && span.end > other.start))
      selected.push(span)
  }
  selected.sort((left, right) => left.start - right.start)
  const segments: ClickableSegment[] = []
  let cursor = 0
  for (const span of selected) {
    if (span.start > cursor) segments.push({ text: points.slice(cursor, span.start).join('') })
    segments.push({ text: points.slice(span.start, span.end).join(''), span })
    cursor = span.end
  }
  if (cursor < points.length || !segments.length)
    segments.push({ text: points.slice(cursor).join('') })
  return segments
}
