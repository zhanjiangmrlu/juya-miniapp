import type { StablePosition } from '@/shared/contracts/common'

export type ProgressCommand =
  | {
      idempotencyKey: string
      kind: 'COMPLETE'
      sceneId: string
    }
  | {
      clientSequence: number
      idempotencyKey: string
      kind: 'POSITION'
      position: StablePosition
      sceneId: string
    }

export interface ProgressQueueStorage {
  clear(): void
  load(): ProgressCommand[]
  save(commands: ProgressCommand[]): void
}

export interface ProgressQueueOptions {
  delay?: number
  idFactory?: () => string
}

export type ProgressSender = (command: ProgressCommand, idempotencyKey: string) => Promise<void>

export interface ProgressQueue {
  clear(): void
  enqueueCompletion(sceneId: string): void
  enqueuePosition(sceneId: string, position: StablePosition): void
  flush(): Promise<void>
  readonly snapshot: ProgressCommand[]
}

/** 创建可持久化的学习进度队列，位置合并而完成命令保持逐条发送。 */
export function createProgressQueue(
  storage: ProgressQueueStorage,
  sender: ProgressSender,
  options: ProgressQueueOptions = {}
): ProgressQueue {
  const delay = options.delay ?? 800
  const idFactory = options.idFactory ?? (() => crypto.randomUUID())
  let commands = storage.load()
  let flushing = false
  let timer: ReturnType<typeof setTimeout> | undefined

  /** 保存当前队列快照，保证异常退出后可以继续发送。 */
  function persist() {
    storage.save(commands)
  }

  /** 延后发送位置更新，并用最后一次滚动重新计时。 */
  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void flush()
    }, delay)
  }

  /** 顺序发送命令；失败项保留原幂等键并等待下一次重试。 */
  async function flush() {
    if (flushing) return
    flushing = true

    try {
      while (commands.length > 0) {
        const command = commands[0]
        try {
          await sender(command, command.idempotencyKey)
          commands = commands.slice(1)
          persist()
        } catch {
          break
        }
      }
    } finally {
      flushing = false
    }
  }

  return {
    /** 清除本地与内存命令，供退出、清空数据和注销流程复用。 */
    clear() {
      if (timer) clearTimeout(timer)
      timer = undefined
      commands = []
      storage.clear()
    },
    /** 完成命令始终追加，禁止与同场景的另一完成动作合并。 */
    enqueueCompletion(sceneId) {
      commands.push({ idempotencyKey: idFactory(), kind: 'COMPLETE', sceneId })
      persist()
    },
    /** 同场景待发送位置只保留最新稳定定位。 */
    enqueuePosition(sceneId, position) {
      const existing = commands.findIndex(
        (command) => command.kind === 'POSITION' && command.sceneId === sceneId
      )
      const command: ProgressCommand = {
        clientSequence: Date.now(),
        idempotencyKey: existing >= 0 ? commands[existing].idempotencyKey : idFactory(),
        kind: 'POSITION',
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
      return structuredClone(commands)
    }
  }
}
