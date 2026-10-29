import { dateText } from '@/services/display'
import { ListeningTimestampKind } from '@/shared/enums/listening'

import type { ListeningSummary } from '@/shared/types/listening'
import type { ListeningResumeLocation } from '@/shared/types/listening-components'
/** 显示服务器确认的对应事件北京时间，不用其他事件推测缺失时间
 * @param article 本人的安全摘要及真实事件时间
 * @param kind 收藏、最近完成或当日接受事件
 */
export const listeningTimestamp = (article: ListeningSummary, kind?: ListeningTimestampKind) => {
  const time =
    kind === ListeningTimestampKind.FAVORITE
      ? article.favorited_at
      : kind === ListeningTimestampKind.DAILY
        ? article.completed_at
        : kind === ListeningTimestampKind.LEARNED
          ? article.last_completed_at
          : null
  const label =
    kind === ListeningTimestampKind.FAVORITE
      ? '收藏'
      : kind === ListeningTimestampKind.DAILY
        ? '当日学习'
        : '最近学习'
  return time ? `${dateText(time)} · ${label}` : ''
}

/** 从真实正文和code point范围提取被点词所在句，越界时不拼造语境
 * @param body 当前发布版本的英文正文
 * @param start 被点词起始字符偏移
 * @param end 被点词结束字符偏移
 */
export const listeningSourceSentence = (body: string, start: number, end: number) => {
  const points = Array.from(body)
  if (start < 0 || end <= start || end > points.length) return ''
  let left = start,
    right = end
  while (left > 0 && !/[.!?\n\r]/u.test(points[left - 1]!)) left--
  while (right < points.length && !/[.!?\n\r]/u.test(points[right]!)) right++
  if (right < points.length && /[.!?]/u.test(points[right]!)) right++
  return points.slice(left, right).join('').trim()
}

/** 格式化服务端真实音频时长，不以词数估算
 * @param seconds 媒体探测得到的音频秒数
 */
export const listeningDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}分${String(total % 60).padStart(2, '0')}秒`
}

/** 展示服务器当前版本的真实续读位置，旧契约仅有字符偏移时明确说明单位
 * @param article 继续学习摘要中的本人当前版本位置
 */
export const listeningResumeText = (article: ListeningResumeLocation) => {
  if (!article.progress) return ''
  if (article.reading_paragraph && article.reading_paragraph > 0)
    return `上次读到第${article.reading_paragraph}段`
  return article.progress.reading_position > 0
    ? `上次读到第${article.progress.reading_position + 1}个字符`
    : '从头开始阅读'
}
