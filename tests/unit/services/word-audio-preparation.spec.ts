import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/errors'
import { createWordAudioPreparation } from '@/services/word-audio-preparation'

import type { WordAudioCancellation, WordAudioFile } from '@/shared/types/pronunciation'

/** 创建可控的异步边界，用于模拟合成与下载的先后顺序 */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** 创建当前页面隔离的发音与本地文件边界 */
const setup = () => {
  const release = vi.fn()
  const resolve = vi.fn(async (id: string, _task: WordAudioCancellation) => `/remote/${id}`)
  const download = vi.fn(
    async (url: string, _task: WordAudioCancellation): Promise<WordAudioFile> => ({
      src: url.replace('/remote/', '/local/'),
      release
    })
  )
  const onFailure = vi.fn()
  const active = vi.fn(() => true)
  const service = createWordAudioPreparation({ resolve, download, active, onFailure })
  return { service, resolve, download, release, active, onFailure }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})
afterEach(() => vi.useRealTimers())

describe('scene word audio preparation', () => {
  it('prepares words in order without autoplay and reuses downloaded sources synchronously', async () => {
    const { service, resolve, download } = setup()
    service.prefetch(['one', 'two'])
    await flushPromises()
    expect(resolve.mock.calls.map(([id]) => id)).toEqual(['one', 'two'])
    expect(service.peek('one')).toBe('/local/one')
    expect(await service.load('one')).toBe('/local/one')
    expect(await service.load('one')).toBe('/local/one')
    expect(download).toHaveBeenCalledTimes(2)
    service.dispose()
  })

  it('shares the current background task with a click and lets another click bypass it', async () => {
    const { service, resolve } = setup()
    const first = deferred<string>()
    resolve.mockImplementation((id) =>
      id === 'one' ? first.promise : Promise.resolve(`/remote/${id}`)
    )
    service.prefetch(['one', 'two', 'three'])
    const shared = service.load('one')
    expect(service.load('one')).toBe(shared)
    expect(await service.load('three')).toBe('/local/three')
    expect(resolve.mock.calls.map(([id]) => id)).toEqual(['one', 'three'])
    first.resolve('/remote/one')
    await shared
    await flushPromises()
    expect(resolve.mock.calls.map(([id]) => id)).toEqual(['one', 'three', 'two'])
    service.dispose()
  })

  it('keeps at most one background job and cancels the previous foreground selection', async () => {
    const { service, resolve, download } = setup()
    const waits = new Map(['background', 'first', 'second'].map((id) => [id, deferred<string>()]))
    resolve.mockImplementation((id) => waits.get(id)!.promise)
    service.prefetch(['background', 'queued'])
    const first = service.load('first')
    const failed = expect(first).rejects.toThrow('试听已取消')
    const second = service.load('second')
    waits.get('second')!.resolve('/remote/second')
    expect(await second).toBe('/local/second')
    await failed
    waits.get('first')!.resolve('/remote/first')
    await flushPromises()
    expect(download.mock.calls.map(([url]) => url)).toEqual(['/remote/second'])
    expect(service.peek('first')).toBeNull()
    expect(resolve.mock.calls.map(([id]) => id)).toEqual(['background', 'first', 'second'])
    service.dispose()
  })

  it('restarts a cancelled foreground word when it is immediately selected again', async () => {
    const { service, resolve } = setup()
    resolve.mockImplementation(() => new Promise(() => {}))
    const first = service.load('one')
    const firstFailed = expect(first).rejects.toThrow('试听已取消')
    const second = service.load('two')
    const secondFailed = expect(second).rejects.toThrow('试听已取消')
    resolve.mockResolvedValueOnce('/remote/one')
    expect(await service.load('one')).toBe('/local/one')
    await Promise.all([firstFailed, secondFailed])
    service.dispose()
  })

  it('cancels an unready foreground word when switching to a cached synchronous source', async () => {
    const { service, resolve } = setup()
    await service.load('ready')
    resolve.mockImplementationOnce(() => new Promise(() => {}))
    const waiting = service.load('slow')
    const failed = expect(waiting).rejects.toThrow('试听已取消')
    expect(service.load('ready')).toBe('/local/ready')
    await failed
    service.dispose()
  })

  it('cancels a pending polling delay immediately instead of waiting for its timer', async () => {
    const { waitForWordAudio } = await import('@/services/word-audio-preparation')
    const { service, resolve } = setup()
    resolve.mockImplementation(async (_id, task) => {
      await waitForWordAudio(5000, task)
      return '/never-ready'
    })
    const pending = service.load('one')
    const failed = expect(pending).rejects.toThrow('试听已取消')
    service.dispose()
    await failed
    expect(vi.getTimerCount()).toBe(0)
  })

  it('expires four minutes from before the address request, releasing the local file', async () => {
    const { service, resolve, release } = setup()
    const address = deferred<string>()
    resolve.mockReturnValueOnce(address.promise)
    const pending = service.load('one')
    await vi.advanceTimersByTimeAsync(10000)
    address.resolve('/remote/one')
    await pending
    await vi.advanceTimersByTimeAsync(229999)
    expect(service.peek('one')).toBe('/local/one')
    await vi.advanceTimersByTimeAsync(1)
    expect(service.peek('one')).toBeNull()
    expect(release).toHaveBeenCalledTimes(1)
    await service.load('one')
    expect(resolve).toHaveBeenCalledTimes(2)
    service.dispose()
  })

  it('falls back to the controlled URL after a download failure and retries after invalidation', async () => {
    const { service, download, resolve, onFailure } = setup()
    download.mockRejectedValueOnce(new Error('network failure'))
    expect(await service.load('one')).toBe('/remote/one')
    expect(onFailure).not.toHaveBeenCalled()
    service.invalidate('one')
    expect(await service.load('one')).toBe('/local/one')
    expect(resolve).toHaveBeenCalledTimes(2)
    service.dispose()
  })

  it.each([401, 409, 410])(
    'does not cache or fall back after access failure %s',
    async (status) => {
      const { service, download, onFailure } = setup()
      const reason = new ApiError('unavailable', '访问已变化', status)
      download.mockRejectedValueOnce(reason)
      await expect(service.load('one')).rejects.toBe(reason)
      expect(service.peek('one')).toBeNull()
      expect(onFailure).toHaveBeenCalledWith(reason)
      service.dispose()
    }
  )

  it('silently skips failed background words and allows an explicit retry', async () => {
    const { service, resolve, onFailure } = setup()
    resolve.mockRejectedValueOnce(new Error('synthesis failed'))
    service.prefetch(['one', 'two'])
    await flushPromises()
    expect(service.peek('one')).toBeNull()
    expect(service.peek('two')).toBe('/local/two')
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(await service.load('one')).toBe('/local/one')
    service.dispose()
  })

  it('aborts tasks and releases both cached and late files when leaving the scene', async () => {
    const { service, download, release } = setup()
    await service.load('ready')
    const file = deferred<WordAudioFile>()
    const cancelled = vi.fn()
    download.mockImplementationOnce((_url, task) => {
      task.onCancel(cancelled)
      return file.promise
    })
    const pending = service.load('pending')
    const failed = expect(pending).rejects.toThrow('试听已取消')
    await flushPromises()
    service.dispose()
    await failed
    expect(cancelled).toHaveBeenCalledTimes(1)
    expect(release).toHaveBeenCalledTimes(1)
    file.resolve({ src: '/late-file', release })
    await flushPromises()
    expect(release).toHaveBeenCalledTimes(2)
    expect(service.peek('ready')).toBeNull()
  })

  it('invalidates the page cache when its captured session or version is no longer active', async () => {
    const { service, active, release } = setup()
    await service.load('one')
    active.mockReturnValue(false)
    expect(service.peek('one')).toBeNull()
    expect(release).toHaveBeenCalledTimes(1)
    await expect(service.load('one')).rejects.toThrow('试听已取消')
  })
})
