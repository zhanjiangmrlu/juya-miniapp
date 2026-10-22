import { onSessionExpired, operations, session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { createLearningQueue } from '@/services/learning-queue'

import type { QueueSource } from '@/shared/enums/learning'
import type { LearningQueue, PublishedScene } from '@/shared/types/learning'

export const sourceQueue = createLearningQueue(session)
let prepared: { queueId: string; scene: PublishedScene; owner: string | null } | null = null
/** 清除导航预取，只在当前账号内存暂存一张正文 */
export const discardPreparedScene = () => {
  prepared = null
}
onSessionExpired(() => {
  sourceQueue.clear()
  discardPreparedScene()
})
/** 在已提交的来源内暂存下一页，避免替换路由后重复请求正文
 * @param queueId 本次本人快照编号
 * @param scene 已由服务端确认可读的下一张正文
 */
export const prepareSourceScene = (queueId: string, scene: PublishedScene) => {
  prepared = { queueId, scene, owner: session.userId() }
}
/** 只允许目标路由一次性消费本人刚取得的正文
 * @param queueId 当前路由快照编号
 * @param cardId 当前路由稳定卡片编号
 */
export const takePreparedScene = (queueId: string, cardId: string) => {
  const value = prepared
  if (
    !value ||
    value.owner !== session.userId() ||
    value.queueId !== queueId ||
    value.scene.card_id !== cardId ||
    !sourceQueue.matches(queueId, cardId)
  )
    return null
  prepared = null
  return value.scene
}
let starting = false
/** 创建来源快照后再进入详情，超时重试复用持久幂等操作
 * @param source 当前卡片所在列表
 * @param cardId 点击的稳定卡片编号
 * @param day 某日打卡来源日期
 */
export const openSourceScene = async (source: QueueSource, cardId: string, day?: string) => {
  if (starting) return
  starting = true
  try {
    const action = `queue:${source}:${cardId}:${day || ''}`
    let queue: LearningQueue | null = null
    if (operations.pending(action)) {
      try {
        queue = await operations.recover<LearningQueue>(action)
      } catch (reason) {
        if (!(reason instanceof ApiError) || reason.code !== 'operation_unknown') throw reason
      }
    }
    if (!queue)
      queue = await operations.run<LearningQueue>(action, '/api/mini/v1/learning-queues', 'POST', {
        source,
        card_id: cardId,
        ...(day ? { day } : {})
      })
    const rollback = sourceQueue.attach(queue, cardId)
    try {
      await new Promise<void>((resolve, reject) =>
        uni.navigateTo({
          url: `/sub-packages/scenes/detail?id=${encodeURIComponent(cardId)}&queue=${encodeURIComponent(queue.id)}`,
          success: () => resolve(),
          fail: () => reject(new Error('场景暂未打开，请重试'))
        })
      )
    } catch (reason) {
      rollback()
      throw reason
    }
  } finally {
    starting = false
  }
}
