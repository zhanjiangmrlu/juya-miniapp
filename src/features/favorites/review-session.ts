import { createRequestId } from '@/services/http/request-id'
import { ReviewCardFace } from '@/shared/enums/favorites'

import type {
  FavoriteReviewOptions,
  ReviewSessionController,
  ReviewSnapshot
} from '@/shared/types/favorites'

export type { ReviewSnapshot } from '@/shared/types/favorites'
export type { ReviewSessionController } from '@/shared/types/favorites'

/** 创建翻卡会话，cardIds 为完整队列，options 为测试可替换的幂等键生成器 */
export const createReviewSession = (
  cardIds: string[],
  options: FavoriteReviewOptions = {}
): ReviewSessionController => {
  const snapshot: ReviewSnapshot = { cardIds: [...cardIds], face: ReviewCardFace.FRONT, index: 0 }
  const completionKey = (options.idFactory ?? createRequestId)()

  return {
    /** 以固定幂等键完成复习，sender 为服务端提交方法 */
    complete: async (sender) => {
      await sender(completionKey)
    },
    /** 只在用户明确点击卡面时翻转正反面 */
    flip: () => {
      snapshot.face =
        snapshot.face === ReviewCardFace.FRONT ? ReviewCardFace.BACK : ReviewCardFace.FRONT
    },
    /** 前往下一张卡并恢复正面 */
    next: () => {
      if (snapshot.index < snapshot.cardIds.length - 1) snapshot.index += 1
      snapshot.face = ReviewCardFace.FRONT
    },
    /** 音频播放由页面处理，此方法刻意不改变卡面状态 */
    playAudio: () => {},
    snapshot
  }
}
