import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/errors'
import { createFullAudioPreparation } from '@/services/full-audio-preparation'

import type { AudioCacheFile, AudioPreparationCancellation } from '@/shared/types/audio'

/** 控制地址或文件何时返回，模拟慢网络与迟到响应 */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}
/** 为单个已鉴权场景创建可观察的准备端口 */
const setup = () => {
  const release = vi.fn(),
    resolve = vi.fn(async () => '/remote-full'),
    download = vi.fn(
      async (_url: string, _task: AudioPreparationCancellation): Promise<AudioCacheFile> => ({
        src: '/local-full',
        release
      })
    ),
    prepared = vi.fn(),
    onFailure = vi.fn(),
    active = vi.fn(() => true)
  const service = createFullAudioPreparation({ resolve, download, prepared, active, onFailure })
  return { service, resolve, download, release, prepared, onFailure, active }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})
afterEach(() => vi.useRealTimers())

it('prepares one local file without playing and returns it synchronously on repeated clicks', async () => {
  const { service, resolve, download, prepared } = setup()
  service.prefetch()
  service.prefetch()
  await flushPromises()
  expect(prepared).toHaveBeenCalledExactlyOnceWith('/local-full')
  expect(service.load()).toBe('/local-full')
  expect(service.load()).toBe('/local-full')
  expect(resolve).toHaveBeenCalledTimes(1)
  expect(download).toHaveBeenCalledTimes(1)
  service.dispose()
})

it('does not begin a queued address request after the page has already been disposed', async () => {
  const { service, resolve } = setup()
  service.prefetch()
  service.dispose()
  await flushPromises()
  expect(resolve).not.toHaveBeenCalled()
})

it('cancels an unfinished background download and streams without waiting for its result', async () => {
  const { service, download, prepared, release } = setup()
  const file = deferred<AudioCacheFile>(),
    cancelled = vi.fn()
  download.mockImplementation((_url, task) => {
    task.onCancel(cancelled)
    return file.promise
  })
  service.prefetch()
  await flushPromises()
  expect(service.load()).toBe('/remote-full')
  expect(cancelled).toHaveBeenCalledTimes(1)
  file.resolve({ src: '/late-local', release })
  await flushPromises()
  expect(release).toHaveBeenCalledTimes(1)
  expect(prepared).not.toHaveBeenCalled()
  expect(service.load()).toBe('/remote-full')
  service.dispose()
})

it('shares a pending address and skips the file download when clicked before it is available', async () => {
  const { service, resolve, download } = setup()
  const address = deferred<string>()
  resolve.mockReturnValue(address.promise)
  service.prefetch()
  const first = service.load(),
    second = service.load()
  expect(first).toBe(second)
  address.resolve('/remote-full')
  expect(await first).toBe('/remote-full')
  await flushPromises()
  expect(resolve).toHaveBeenCalledTimes(1)
  expect(download).not.toHaveBeenCalled()
  service.dispose()
})

it('falls back to the controlled URL after background download failure', async () => {
  const { service, download } = setup()
  download.mockRejectedValueOnce(new Error('offline'))
  service.prefetch()
  await flushPromises()
  expect(service.load()).toBe('/remote-full')
  service.dispose()
})

it('retries a failed address only when explicitly clicked', async () => {
  const { service, resolve, onFailure } = setup()
  resolve.mockRejectedValueOnce(new Error('network'))
  service.prefetch()
  await flushPromises()
  expect(resolve).toHaveBeenCalledTimes(1)
  expect(onFailure).toHaveBeenCalledTimes(1)
  expect(await service.load()).toBe('/remote-full')
  expect(resolve).toHaveBeenCalledTimes(2)
  service.dispose()
})

it('expires four minutes from request start and fetches a fresh address on the next click', async () => {
  const { service, resolve, release } = setup()
  const address = deferred<string>()
  resolve.mockReturnValueOnce(address.promise)
  service.prefetch()
  await vi.advanceTimersByTimeAsync(10000)
  address.resolve('/remote-full')
  await flushPromises()
  expect(service.load()).toBe('/local-full')
  await vi.advanceTimersByTimeAsync(230000)
  expect(release).toHaveBeenCalledTimes(1)
  expect(await service.load()).toBe('/remote-full')
  expect(resolve).toHaveBeenCalledTimes(2)
  service.dispose()
})

it('invalidates local files after an actual playback failure', async () => {
  const { service, resolve, release } = setup()
  service.prefetch()
  await flushPromises()
  service.invalidate()
  expect(release).toHaveBeenCalledTimes(1)
  expect(await service.load()).toBe('/remote-full')
  expect(resolve).toHaveBeenCalledTimes(2)
  service.dispose()
})

it('rejects a pending click promptly on dispose and never downloads a late URL', async () => {
  const { service, resolve, download } = setup()
  const address = deferred<string>()
  resolve.mockReturnValue(address.promise)
  service.prefetch()
  const pending = service.load()
  const failed = expect(pending).rejects.toThrow('音频准备已取消')
  service.dispose()
  await failed
  address.resolve('/late')
  await flushPromises()
  expect(download).not.toHaveBeenCalled()
})

it('releases a late downloaded file after its page or session changes', async () => {
  const { service, download, active, prepared, release } = setup()
  const file = deferred<AudioCacheFile>()
  download.mockReturnValue(file.promise)
  service.prefetch()
  await flushPromises()
  active.mockReturnValue(false)
  file.resolve({ src: '/late', release })
  await flushPromises()
  expect(release).toHaveBeenCalledTimes(1)
  expect(prepared).not.toHaveBeenCalled()
  service.dispose()
})

it.each([401, 409, 410])('does not stream a resource rejected with status %s', async (status) => {
  const { service, download, onFailure } = setup()
  const error = new ApiError('unavailable', '访问已变化', status)
  download.mockRejectedValueOnce(error)
  service.prefetch()
  await flushPromises()
  expect(onFailure).toHaveBeenCalledWith(error)
  expect(await service.load()).toBe('/remote-full')
  service.dispose()
})
