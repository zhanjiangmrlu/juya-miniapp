import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProgressQueue } from '@/features/learning-progress/progress-queue'

import type { StablePosition } from '@/shared/contracts/common'
import type { ProgressCommand, ProgressQueueStorage } from '@/shared/types/learning-progress'

/** 创建内存队列存储，便于观察持久化与清理行为。 */
function createStorage(): ProgressQueueStorage {
  let commands: ProgressCommand[] = []
  return {
    clear: vi.fn(() => {
      commands = []
    }),
    load: vi.fn(() => commands),
    save: vi.fn((next) => {
      commands = structuredClone(next)
    })
  }
}

const firstPosition: StablePosition = { entry_id: 'entry-1', offset: 0 }
const latestPosition: StablePosition = { entry_id: 'entry-2', offset: 8 }

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('createProgressQueue', () => {
  it('在微信缺少 Web Crypto 时生成稳定的可重试命令', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('crypto', undefined)
    vi.stubGlobal('structuredClone', undefined)
    const sender = vi.fn(async () => undefined).mockRejectedValueOnce(new Error('offline'))
    const queue = createProgressQueue({ clear: vi.fn(), load: () => [], save: vi.fn() }, sender)
    queue.enqueuePosition('scene-1', firstPosition)
    queue.enqueueCompletion('scene-1')
    await queue.flush()
    await queue.flush()
    expect(sender.mock.calls).toHaveLength(3)
    expect(sender.mock.calls[0]).toEqual(sender.mock.calls[1])
    expect(queue.snapshot).toEqual([])
    queue.clear()
  })
  it('800ms 内同场景位置只发送最新一条', async () => {
    vi.useFakeTimers()
    const sender = vi.fn(async (_command: ProgressCommand, _key: string) => undefined)
    const queue = createProgressQueue(createStorage(), sender, { idFactory: () => 'key-1' })

    queue.enqueuePosition('scene-1', firstPosition)
    queue.enqueuePosition('scene-1', latestPosition)
    await vi.advanceTimersByTimeAsync(799)
    expect(sender).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(sender).toHaveBeenCalledOnce()
    expect(sender.mock.calls[0]?.[0]).toMatchObject({ position: latestPosition })
  })

  it('完成命令不合并，失败重试复用原幂等键', async () => {
    vi.useFakeTimers()
    const sender = vi
      .fn(async (_command: ProgressCommand, _key: string) => undefined)
      .mockRejectedValueOnce(new Error('offline'))
    const ids = ['complete-1', 'complete-2']
    const queue = createProgressQueue(createStorage(), sender, {
      idFactory: () => ids.shift() ?? 'unexpected'
    })

    queue.enqueueCompletion('scene-1')
    queue.enqueueCompletion('scene-1')
    await queue.flush()
    await queue.flush()

    expect(sender.mock.calls.map((call) => call[1])).toEqual([
      'complete-1',
      'complete-1',
      'complete-2'
    ])
  })

  it('退出、清空学习数据或注销时清除未发送命令', () => {
    const storage = createStorage()
    const queue = createProgressQueue(
      storage,
      vi.fn(async () => undefined)
    )
    queue.enqueuePosition('scene-1', firstPosition)

    queue.clear()

    expect(storage.clear).toHaveBeenCalledOnce()
    expect(queue.snapshot).toEqual([])
  })
})
