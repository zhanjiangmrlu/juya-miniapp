import { createRequestId } from '@/services/http/request-id'
import { ProgressCommandKind } from '@/shared/enums/learning-progress'

import type { HttpStatusCarrier } from '@/shared/types/http'
import type {
  ProgressCommand,
  ProgressQueue,
  ProgressQueueOptions,
  ProgressQueueStorage,
  ProgressSender
} from '@/shared/types/learning-progress'

export type { ProgressCommand } from '@/shared/types/learning-progress'
export type { ProgressQueueStorage } from '@/shared/types/learning-progress'
export type { ProgressQueueOptions } from '@/shared/types/learning-progress'
export type { ProgressSender } from '@/shared/types/learning-progress'
export type { ProgressQueue } from '@/shared/types/learning-progress'

const activeQueues = new Set<ProgressQueue>()
/** 清除所有仍存活页面的学习队列，阻止清空之后重建旧进度 */
export const clearProgressQueues = () => {
  for (const queue of activeQueues) queue.clear()
}

/** 创建持久化队列，storage 为本地存储，sender 为发送端口，options 为延迟、幂等键及终态回调 */
export const createProgressQueue = (
  storage: ProgressQueueStorage,
  sender: ProgressSender,
  options: ProgressQueueOptions = {}
): ProgressQueue => {
  const delay = options.delay ?? PROGRESS_QUEUE_DELAY_MS
  const idFactory = options.idFactory ?? createRequestId
  let commands = storage.load()
  let flushing = false
  let generation = 0
  let lastSequence = Math.max(
    0,
    ...commands.map((command) =>
      command.kind === ProgressCommandKind.POSITION ? command.clientSequence : 0
    )
  )
  let inFlight: ProgressCommand | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  /** 保存当前队列快照，保证异常退出后可以继续发送 */
  const persist = () => {
    storage.save(commands)
  }

  /** 延后发送位置更新，并用最后一次滚动重新计时 */
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void flush()
    }, delay)
  }

  /** 顺序发送命令，可恢复错误保留原幂等键，终态拒绝移除该场景并通知页面 */
  const flush = async () => {
    if (flushing) return
    flushing = true
    const request = generation

    try {
      while (commands.length > 0) {
        const command = commands[0]
        inFlight = command
        try {
          await sender(command, command.idempotencyKey)
          if (request !== generation) return
          commands = commands.filter((candidate) => candidate !== command)
          persist()
        } catch (error) {
          if (request !== generation) return
          const status = (error as HttpStatusCarrier)?.status
          if (![401, 403, 404, 409, 410].includes(status ?? 0)) break
          commands = commands.filter((candidate) => candidate.sceneId !== command.sceneId)
          persist()
          options.onTerminalFailure?.(command, error)
          if (request !== generation) return
        }
      }
    } finally {
      inFlight = undefined
      flushing = false
    }
  }

  const queue: ProgressQueue = {
    dispose() {
      generation++
      if (timer) clearTimeout(timer)
      timer = undefined
      activeQueues.delete(queue)
    },
    /** 清除本地与内存命令，供退出、清空数据和注销流程复用。 */
    clear() {
      generation++
      if (timer) clearTimeout(timer)
      timer = undefined
      commands = []
      storage.clear()
    },
    /** 完成命令始终追加，禁止与同场景的另一完成动作合并。 */
    enqueueCompletion(sceneId) {
      commands.push({ idempotencyKey: idFactory(), kind: ProgressCommandKind.COMPLETE, sceneId })
      persist()
    },
    /** 同场景待发送位置只保留最新稳定定位。 */
    enqueuePosition(sceneId, position) {
      const existing = commands.findIndex(
        (command) => command.kind === ProgressCommandKind.POSITION && command.sceneId === sceneId
      )
      const command: ProgressCommand = {
        clientSequence: (lastSequence = Math.max(Date.now(), lastSequence + 1)),
        idempotencyKey:
          existing >= 0 && commands[existing] !== inFlight
            ? commands[existing].idempotencyKey
            : idFactory(),
        kind: ProgressCommandKind.POSITION,
        position,
        sceneId
      }

      if (existing >= 0) commands.splice(existing, 1, command)
      else commands.push(command)
      persist()
      schedule()
    },
    flush,
    get snapshot() {
      return commands.map((command) =>
        command.kind === ProgressCommandKind.POSITION
          ? { ...command, position: { ...command.position } }
          : { ...command }
      )
    }
  }
  activeQueues.add(queue)
  return queue
}
import { PROGRESS_QUEUE_DELAY_MS } from '@/shared/constants/learning-progress'
