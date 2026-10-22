import { ApiError } from '@/services/errors'

import type { ReadingPosition, ReadingPositionWriterPorts } from '@/shared/types/learning'

/** 合并hide/unload的同位置保存，未知结果先恢复且不同账号不串写
 * @param ports 本人账号与持久幂等操作端口
 */
export const createReadingPositionWriter = (ports: ReadingPositionWriterPorts) => {
  let confirmed = '',
    inFlight: Promise<void> | null = null
  /** 保存当前版本的可信阅读位置，不触碰完成和打卡
   * @param cardId 当前实际阅读的稳定卡片编号
   * @param position 已按真实布局计算的正文位置
   */
  const save = async (cardId: string, position: ReadingPosition): Promise<void> => {
    const owner = ports.userId()
    if (!owner) return
    const fingerprint = JSON.stringify([owner, cardId, position])
    if (confirmed === fingerprint) return
    if (inFlight) {
      await inFlight
      if (owner === ports.userId()) await save(cardId, position)
      return
    }
    const action = `reading:${cardId}:${position.version_id}`
    /** 串行确认上次位置后再提交新位置，迟到旧回执不能覆盖较新保存 */
    const perform = async () => {
      if (ports.pending(action)) {
        try {
          await ports.recover(action)
        } catch (reason) {
          if (!(reason instanceof ApiError) || reason.code !== 'operation_unknown') throw reason
        }
      }
      if (owner !== ports.userId()) return
      await ports.run(
        action,
        `/api/mini/v1/cards/${encodeURIComponent(cardId)}/reading-position`,
        'PUT',
        position
      )
      if (owner === ports.userId()) confirmed = fingerprint
    }
    inFlight = perform()
    try {
      await inFlight
    } finally {
      inFlight = null
    }
  }
  return { save }
}
