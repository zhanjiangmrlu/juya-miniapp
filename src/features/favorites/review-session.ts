export interface ReviewSnapshot {
  cardIds: string[]
  face: 'BACK' | 'FRONT'
  index: number
}

export interface ReviewSessionController {
  complete(sender: (idempotencyKey: string) => Promise<void>): Promise<void>
  flip(): void
  next(): void
  playAudio(): void
  readonly snapshot: ReviewSnapshot
}

/** 创建翻卡会话；播放音频与翻面严格分离，完成重试复用同一幂等键。 */
export function createReviewSession(
  cardIds: string[],
  options: { idFactory?: () => string } = {}
): ReviewSessionController {
  const snapshot: ReviewSnapshot = { cardIds: [...cardIds], face: 'FRONT', index: 0 }
  const completionKey = (options.idFactory ?? (() => crypto.randomUUID()))()

  return {
    /** 完成会话时始终使用创建控制器时生成的固定幂等键。 */
    async complete(sender) {
      await sender(completionKey)
    },
    /** 只在用户明确点击卡面时翻转正反面。 */
    flip() {
      snapshot.face = snapshot.face === 'FRONT' ? 'BACK' : 'FRONT'
    },
    /** 前往下一张卡并恢复正面。 */
    next() {
      if (snapshot.index < snapshot.cardIds.length - 1) snapshot.index += 1
      snapshot.face = 'FRONT'
    },
    /** 音频播放由页面处理，此方法刻意不改变卡面状态。 */
    playAudio() {},
    snapshot
  }
}
