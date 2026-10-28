import { dateText } from '@/services/display'
import { ListeningTimestampKind } from '@/shared/enums/listening'

import type { ListeningSummary } from '@/shared/types/listening'
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
