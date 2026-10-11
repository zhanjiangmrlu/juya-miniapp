import { createRequestId } from '@/services/http/request-id'
import { SHORT_READING_PROGRESS_DELAY_MS } from '@/shared/constants/short-reading'

import type { ShortReadingPosition } from '@/shared/contracts/short-reading'
import type {
  ShortReadingProgressCommand,
  ShortReadingQueueOptions
} from '@/shared/types/short-reading'

/** 创建本次身份会话的独立短文重试队列，options 为保存、失权清理、幂等键和防抖端口 */
export const createShortReadingProgressQueue = (options: ShortReadingQueueOptions) => {
  let pending: ShortReadingProgressCommand | undefined
  let sending: Promise<void> | undefined
  let generation = 0
  let clientSequence = 0
  let paused = false
  let timer: ReturnType<typeof setTimeout> | undefined

  /** 取消尚未执行的防抖提交 */
  const cancelTimer = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  /** 丢弃受限命令并取消当前代次，不让迟到拒绝影响新的阅读页 */
  const clear = () => {
    generation++
    pending = undefined
    cancelTimer()
  }

  /** 顺序提交最新段落，失败保留原请求体与幂等键，当前失权立即丢弃 */
  const flush = (): Promise<void> => {
    if (sending) return sending
    cancelTimer()
    const request = generation
    sending = (async () => {
      while (pending && !paused && request === generation) {
        const command = pending
        try {
          await options.save(command)
          if (request !== generation) return
          if (pending === command) pending = undefined
        } catch (error) {
          if (request === generation && options.denied(error)) {
            clear()
            options.onDenied()
          }
          return
        }
      }
    })().finally(() => {
      sending = undefined
      // 重新授权后续发保留命令，旧请求的网络失败不能触发无限重试
      if (request !== generation && pending && !paused) void flush()
    })
    return sending
  }

  return {
    clear,
    flush,
    /** 用服务器最新序号建立基线，sequence 为本篇当前用户的已接受序号 */
    seed: (sequence: number) => {
      clientSequence = Math.max(clientSequence, sequence || 0)
    },
    /** 合并待提交的最新阅读位置，contentId 为短文ID，contentVersion 为发布版本，position 为段落锚点和段内偏移 */
    enqueue: (contentId: string, contentVersion: number, position: ShortReadingPosition) => {
      clientSequence = Math.max(clientSequence + 1, Date.now())
      pending = {
        contentId,
        contentVersion,
        idempotencyKey: (options.idFactory ?? createRequestId)(),
        position: { ...position, content_version: contentVersion, client_sequence: clientSequence }
      }
      cancelTimer()
      if (!paused)
        timer = setTimeout(() => {
          timer = undefined
          void flush()
        }, options.delay ?? SHORT_READING_PROGRESS_DELAY_MS)
    },
    /** 暂停隐藏页面的自动提交，返回后必须先重新授权 */
    pause: () => {
      generation++
      paused = true
      cancelTimer()
    },
    /** 重新授权成功后允许失败命令重试 */
    resume: () => {
      paused = false
    },
    get snapshot() {
      return pending ? [{ ...pending, position: { ...pending.position } }] : []
    }
  }
}
