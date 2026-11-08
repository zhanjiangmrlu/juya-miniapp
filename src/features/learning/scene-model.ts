/** 格式化完整音频的实际秒数
 * @param seconds 音频位置或时长
 */
export const audioTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
