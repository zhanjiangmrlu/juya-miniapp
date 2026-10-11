import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolvePronunciation } from '@/features/audio/pronunciation-controller'

const context = { favorite_id: 'favorite-1' }
const target = { target_id: 'confirmed-reading', can_prepare: true }
afterEach(() => vi.useRealTimers())

describe('受控发音准备', () => {
  it('同次动作只创建一次准备请求，轮询完成后返回固定资源', async () => {
    vi.useFakeTimers()
    const service = {
      resolve: vi.fn(async () => ({ status: 'PREPARING', task_id: 'task-1' })),
      task: vi.fn(async () => ({ status: 'READY', url: 'signed', resource_version: 'v2' }))
    }
    const result = resolvePronunciation(
      target,
      context,
      service as never,
      new AbortController().signal
    )
    await vi.runAllTimersAsync()
    expect(await result).toMatchObject({ status: 'READY', url: 'signed', resource_version: 'v2' })
    expect(service.resolve).toHaveBeenCalledTimes(1)
    expect(service.task).toHaveBeenCalledTimes(1)
  })
  it('准备未完成在30秒内终止，不重复创建付费任务', async () => {
    vi.useFakeTimers()
    const service = {
      resolve: vi.fn(async () => ({ status: 'PREPARING', task_id: 'task-1' })),
      task: vi.fn(async () => ({ status: 'PREPARING', task_id: 'task-1' }))
    }
    const result = resolvePronunciation(
      target,
      context,
      service as never,
      new AbortController().signal
    )
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await result).toMatchObject({
      status: 'FAILED',
      code: 'PREPARATION_TIMEOUT',
      can_retry: true
    })
    expect(service.resolve).toHaveBeenCalledTimes(1)
    expect(service.task.mock.calls.length).toBeLessThan(16)
  })
  it('切目标取消计时并忽略迟到任务结果', async () => {
    vi.useFakeTimers()
    const abort = new AbortController()
    const service = {
      resolve: vi.fn(async () => ({ status: 'PREPARING', task_id: 'task-1' })),
      task: vi.fn()
    }
    const result = resolvePronunciation(target, context, service as never, abort.signal).catch(
      (error) => error
    )
    await vi.advanceTimersByTimeAsync(0)
    abort.abort()
    await vi.runAllTimersAsync()
    expect((await result).name).toBe('AbortError')
    expect(service.task).not.toHaveBeenCalled()
  })
  it.each(['FAILED', 'UNAVAILABLE'])('尊重服务端终态%s，不循环重试', async (status) => {
    const service = { resolve: async () => ({ status, can_retry: false }), task: vi.fn() }
    const result = await resolvePronunciation(
      target,
      context,
      service as never,
      new AbortController().signal
    )
    expect(result.status).toBe(status)
    expect(service.task).not.toHaveBeenCalled()
  })
})
