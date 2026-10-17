/** 将服务器ISO时间固定显示为北京时间，不依赖设备所选时区
 * @param value 服务端已确认时间
 */
export const dateText = (value?: string | null) => {
  if (!value) return '未开始'
  const instant = Date.parse(value)
  if (!Number.isFinite(instant)) return '暂未获取'
  const date = new Date(instant + 8 * 3600 * 1000)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}
