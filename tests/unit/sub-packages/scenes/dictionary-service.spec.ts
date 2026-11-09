import { afterEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({ request: vi.fn(), download: vi.fn(), release: vi.fn() }))
vi.mock('@/services/api', () => ({
  session: { contentRequest: ports.request, request: ports.request }
}))
vi.mock('@/services/platform', () => ({
  operationKey: () => 'dictionary-operation-key',
  resourceURL: (url: string) => `https://api.example${url}`
}))
vi.mock('@/services/word-audio-file', () => ({ prepareWordAudioFile: ports.download }))
import {
  createDictionarySpeech,
  createDictionarySpeechCache
} from '@/sub-packages/scenes/dictionary-service'

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('prepares only after an explicit load and posts the original clicked reference before polling the same controlled target', async () => {
  vi.useFakeTimers()
  ports.request
    .mockResolvedValueOnce({ state: 'missing' })
    .mockResolvedValueOnce({ state: 'processing', retry_after: 0.25 })
    .mockResolvedValueOnce({ state: 'ready', url: '/api/mini/v1/dictionary-pronunciation/opaque' })
  ports.download.mockResolvedValue({ src: 'local-word.wav', release: ports.release })
  const reference = { version_id: 'version', word: 'went', line_id: 'line-1', start: 3, end: 7 }
  const speech = createDictionarySpeech({ cardId: 'card', ...reference }, () => true, vi.fn())
  expect(ports.request).not.toHaveBeenCalled()
  const pending = speech.load()
  await vi.advanceTimersByTimeAsync(250)
  expect(await pending).toBe('local-word.wav')
  expect(ports.request).toHaveBeenNthCalledWith(
    2,
    '/api/mini/v1/cards/card/dictionary/pronunciation',
    { method: 'POST', key: 'dictionary-operation-key', body: reference }
  )
  expect(ports.request).toHaveBeenNthCalledWith(
    1,
    '/api/mini/v1/cards/card/dictionary/pronunciation?version_id=version&word=went&line_id=line-1&start=3&end=7',
    {}
  )
  expect(ports.request.mock.calls[1]![1].body).not.toHaveProperty('lemma')
  expect(ports.request.mock.calls[1]![1].body).not.toHaveProperty('speech_text')
  speech.dispose()
  expect(ports.release).toHaveBeenCalledTimes(1)
})

it('prefetches visible exact references first with two GET-only slots and releases processing slots', async () => {
  vi.useFakeTimers()
  const references = ['car', 'police', 'read', 'read'].map((word, index) => ({
    cardId: 'card',
    version_id: 'v1',
    word,
    line_id: `line-${index}`,
    start: 0,
    end: word.length
  }))
  const waiting: ((value: unknown) => void)[] = []
  ports.request.mockImplementation(() => new Promise((resolve) => waiting.push(resolve)))
  ports.download.mockResolvedValue({ src: 'cached', release: ports.release })
  const cache = createDictionarySpeechCache(() => true, vi.fn())
  cache.prefetch(references, [references[2]!])
  expect(ports.request).toHaveBeenCalledTimes(2)
  expect(ports.request.mock.calls[0]![0]).toContain('line_id=line-2')
  expect(ports.request.mock.calls[1]![0]).toContain('line_id=line-0')
  waiting[0]!({ state: 'processing', retry_after: 1 })
  await vi.advanceTimersByTimeAsync(0)
  expect(ports.request).toHaveBeenCalledTimes(3)
  waiting[1]!({ state: 'missing' })
  await vi.advanceTimersByTimeAsync(0)
  expect(ports.request).toHaveBeenCalledTimes(4)
  expect(ports.request.mock.calls[3]![0]).toContain('line_id=line-3')
  expect(ports.request.mock.calls.every((call) => !call[1]?.method)).toBe(true)
  cache.dispose()
})

it('promotes processing with an independent foreground POST, reuses files after popup close, and expires on scope loss', async () => {
  vi.useFakeTimers()
  let active = true
  const reference = {
    cardId: 'card',
    version_id: 'v1',
    word: 'read',
    line_id: 'line',
    start: 0,
    end: 4
  }
  ports.request.mockResolvedValue({ state: 'processing', retry_after: 1 })
  ports.download.mockResolvedValue({ src: 'local-read', release: ports.release })
  const cache = createDictionarySpeechCache(() => active, vi.fn())
  cache.prefetch([reference])
  await vi.advanceTimersByTimeAsync(0)
  ports.request
    .mockResolvedValueOnce({ state: 'processing', retry_after: 1 })
    .mockResolvedValueOnce({ state: 'ready', url: '/read.wav' })
  const speech = cache.prepare(reference)
  expect(await speech.load()).toBe('local-read')
  expect(ports.request.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(true)
  speech.cancelSelection?.()
  expect(await cache.prepare(reference).load()).toBe('local-read')
  expect(ports.download).toHaveBeenCalledTimes(1)
  active = false
  await expect(cache.prepare(reference).load()).rejects.toThrow('试听已取消')
  expect(ports.release).toHaveBeenCalledOnce()
  cache.dispose()
})

it('downloads at most two background files, keeps same-spelling references separate, and lets a click bypass both slots', async () => {
  vi.useFakeTimers()
  const references = [0, 1, 2].map((index) => ({
    cardId: 'card',
    version_id: 'v1',
    word: 'read',
    line_id: `line-${index}`,
    start: 0,
    end: 4
  }))
  const downloads: ((value: { src: string; release: () => void }) => void)[] = []
  ports.request.mockResolvedValue({
    state: 'ready',
    url: '/api/mini/v1/dictionary-pronunciation/word'
  })
  ports.download.mockImplementation(() => new Promise((resolve) => downloads.push(resolve)))
  const cache = createDictionarySpeechCache(() => true, vi.fn())
  cache.prefetch([...references, references[0]!])
  await vi.advanceTimersByTimeAsync(0)
  expect(ports.download).toHaveBeenCalledTimes(2)
  const selected = cache.prepare(references[2]!).load()
  await vi.advanceTimersByTimeAsync(0)
  expect(ports.download).toHaveBeenCalledTimes(3)
  downloads[2]!({ src: 'foreground-read', release: ports.release })
  expect(await selected).toBe('foreground-read')
  downloads[0]!({ src: 'past-read', release: ports.release })
  downloads[1]!({ src: 'present-read', release: ports.release })
  await vi.advanceTimersByTimeAsync(0)
  expect(await cache.prepare(references[0]!).load()).toBe('past-read')
  expect(await cache.prepare(references[1]!).load()).toBe('present-read')
  expect(ports.request).toHaveBeenCalledTimes(3)
  cache.dispose()
  expect(ports.release).toHaveBeenCalledTimes(3)
})

it('cancels foreground generation on close and stops all processing polls on dispose', async () => {
  vi.useFakeTimers()
  const reference = {
    cardId: 'card',
    version_id: 'v1',
    word: 'police',
    line_id: 'line',
    start: 0,
    end: 6
  }
  ports.request.mockResolvedValue({ state: 'processing', retry_after: 1 })
  const cache = createDictionarySpeechCache(() => true, vi.fn())
  cache.prefetch([reference])
  await vi.advanceTimersByTimeAsync(0)
  const speech = cache.prepare(reference),
    pending = speech.load()
  const cancelled = expect(pending).rejects.toThrow('试听已取消')
  await vi.advanceTimersByTimeAsync(0)
  speech.cancelSelection?.()
  await cancelled
  cache.dispose()
  const count = ports.request.mock.calls.length
  await vi.advanceTimersByTimeAsync(10000)
  expect(ports.request).toHaveBeenCalledTimes(count)
  expect(ports.download).not.toHaveBeenCalled()
})

it('lets explicit selection retry a failed controlled pronunciation after server cooldown', async () => {
  ports.request
    .mockResolvedValueOnce({ state: 'failed', error_code: 'tts_unavailable' })
    .mockResolvedValueOnce({ state: 'ready', url: '/api/mini/v1/dictionary-pronunciation/retry' })
  ports.download.mockResolvedValue({ src: 'recovered-word', release: ports.release })
  const cache = createDictionarySpeechCache(() => true, vi.fn())
  const speech = cache.prepare({
    cardId: 'card',
    version_id: 'v1',
    word: 'car',
    line_id: 'line',
    start: 0,
    end: 3
  })
  expect(await speech.load()).toBe('recovered-word')
  expect(ports.request.mock.calls[1]![1].method).toBe('POST')
  cache.dispose()
})

it('counts the four-minute cache lifetime from before the background address request', async () => {
  vi.useFakeTimers()
  let finish!: (value: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  ports.download.mockResolvedValue({ src: 'local-car', release: ports.release })
  const cache = createDictionarySpeechCache(() => true, vi.fn())
  cache.prefetch([
    { cardId: 'card', version_id: 'v1', word: 'car', line_id: 'line', start: 0, end: 3 }
  ])
  await vi.advanceTimersByTimeAsync(10000)
  finish({ state: 'ready', url: '/api/mini/v1/dictionary-pronunciation/car' })
  await vi.advanceTimersByTimeAsync(230000)
  expect(ports.release).toHaveBeenCalledOnce()
  cache.dispose()
})

it('reports a forbidden background download once without caching or streaming the protected URL', async () => {
  vi.useFakeTimers()
  const { ApiError } = await import('@/services/errors')
  const denied = new ApiError('learning_access_required', '需学习授权', 403),
    onFailure = vi.fn()
  ports.request.mockResolvedValue({
    state: 'ready',
    url: '/api/mini/v1/dictionary-pronunciation/car'
  })
  ports.download.mockRejectedValue(denied)
  const cache = createDictionarySpeechCache(() => true, onFailure)
  cache.prefetch([
    { cardId: 'card', version_id: 'v1', word: 'car', line_id: 'line', start: 0, end: 3 }
  ])
  await vi.advanceTimersByTimeAsync(0)
  expect(onFailure).toHaveBeenCalledOnce()
  expect(onFailure).toHaveBeenCalledWith(denied)
  expect(ports.release).not.toHaveBeenCalled()
  cache.dispose()
})
