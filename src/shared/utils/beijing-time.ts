export type Greeting = '下午好' | '早上好' | '晚上好'

const BEIJING_HOUR_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Shanghai'
})

const BEIJING_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Shanghai',
  weekday: 'long',
  year: 'numeric'
})

/** 按北京时间划分早、午、晚三个问候时段。 */
export function getBeijingGreeting(now: Date): Greeting {
  const hourPart = BEIJING_HOUR_FORMATTER.formatToParts(now).find((part) => part.type === 'hour')
  const hour = Number(hourPart?.value)

  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/** 将时间格式化为首页使用的北京时间日期文案。 */
export function formatBeijingDate(now: Date): string {
  return BEIJING_DATE_FORMATTER.format(now)
}
