import { afterEach, describe, expect, it, vi } from 'vitest'

import { createShortReadingProgressQueue } from '@/features/short-reading/short-reading-progress'

import type { ShortReadingProgressCommand } from '@/shared/types/short-reading'

afterEach(() => vi.useRealTimers())

describe('短文独立进度队列', () => {
  it('页面隐藏再授权后，上一代位置拒绝不会撤销新的阅读授权', async () => {
    vi.useFakeTimers()
    let reject!: (error: unknown) => void
    const denied = vi.fn()
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail
          })
      )
      .mockResolvedValue(undefined)
    const queue = createShortReadingProgressQueue({ save, denied: () => true, onDenied: denied })
    queue.enqueue('reading', 2, { paragraph_id: 'p1', offset: 0 })
    const sending = queue.flush()
    queue.pause()
    queue.resume()
    reject({ status: 403 })
    await sending
    expect(denied).not.toHaveBeenCalled()
    await queue.flush()
    expect(queue.snapshot).toEqual([])
    queue.clear()
  })
  it('合并本篇位置并递增服务端序号，改变请求体使用新的幂等键', async () => {
    vi.useFakeTimers()
    const sent: ShortReadingProgressCommand[] = []
    let sequence = 0
    const queue = createShortReadingProgressQueue({
      save: async (command) => {
        sent.push(command)
      },
      denied: () => false,
      onDenied: vi.fn(),
      idFactory: () => `key-${++sequence}`
    })
    queue.seed(9999999999999)
    queue.enqueue('reading', 2, { paragraph_id: 'p1', offset: 1 })
    queue.enqueue('reading', 2, { paragraph_id: 'p2', offset: 14 })
    await queue.flush()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      contentId: 'reading',
      contentVersion: 2,
      idempotencyKey: 'key-2',
      position: { paragraph_id: 'p2', offset: 14, content_version: 2 }
    })
    expect(sent[0].position.client_sequence).toBe(10000000000001)
    expect(sent[0]).not.toHaveProperty('sceneId')
    queue.clear()
  })

  it('失败重试复用命令，失权响应后不再保留任何受限写入', async () => {
    vi.useFakeTimers()
    const denied = vi.fn()
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce({ status: 403 })
    const queue = createShortReadingProgressQueue({
      save,
      denied: (error) => (error as { status?: number }).status === 403,
      onDenied: denied
    })
    queue.enqueue('reading', 1, { paragraph_id: 'p1', offset: 0 })
    await queue.flush()
    const original = queue.snapshot
    await queue.flush()
    expect(save.mock.calls[0]).toEqual(save.mock.calls[1])
    expect(original).toHaveLength(1)
    expect(queue.snapshot).toEqual([])
    expect(denied).toHaveBeenCalledOnce()
  })

  it('上一页进度迟到拒绝不会撤销新页面授权', async () => {
    vi.useFakeTimers()
    let reject!: (error: unknown) => void
    const denied = vi.fn()
    const queue = createShortReadingProgressQueue({
      save: () =>
        new Promise((_, fail) => {
          reject = fail
        }),
      denied: () => true,
      onDenied: denied
    })
    queue.enqueue('old', 1, { paragraph_id: 'old-p', offset: 0 })
    const sending = queue.flush()
    queue.clear()
    queue.enqueue('new', 1, { paragraph_id: 'new-p', offset: 0 })
    reject({ status: 403 })
    await sending
    expect(denied).not.toHaveBeenCalled()
    expect(queue.snapshot[0].contentId).toBe('new')
    queue.clear()
  })
})
