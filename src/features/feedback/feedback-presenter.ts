import { FEEDBACK_STATUS_LABELS as STATUS_LABELS } from '@/shared/constants/feedback'

import type { FeedbackItem } from '@/shared/contracts/feedback'

/** 把服务端稳定状态码转换为用户可读文案，未知状态保持中性表达。 */
export function getFeedbackStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? '处理中'
}

/** 将反馈时间格式化为北京时间的简洁列表文案。 */
export function formatFeedbackTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai'
  }).format(new Date(value))
}

/** 按时间顺序合并用户说明、管理员回复和用户补充，供时间线组件统一渲染。 */
export function presentFeedbackTimeline(feedback: FeedbackItem) {
  const entries = [
    { at: feedback.created_at, label: '已提交', text: feedback.description, tone: 'user' as const },
    ...(feedback.reply
      ? [
          {
            at: feedback.resolved_at ?? feedback.created_at,
            label: '句芽回复',
            text: feedback.reply,
            tone: 'service' as const
          }
        ]
      : []),
    ...(feedback.supplements ?? []).map((item) => ({
      at: item.created_at,
      label: '我的补充',
      text: item.text,
      tone: 'user' as const
    }))
  ]
  return entries.sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
}
