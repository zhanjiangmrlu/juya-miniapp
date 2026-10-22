import { afterEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({ request: vi.fn(), download: vi.fn(), release: vi.fn() }))
vi.mock('@/services/api', () => ({ session: { request: ports.request } }))
vi.mock('@/services/platform', () => ({
  operationKey: () => 'dictionary-operation-key',
  resourceURL: (url: string) => `https://api.example${url}`
}))
vi.mock('@/services/word-audio-file', () => ({ prepareWordAudioFile: ports.download }))
import { createDictionarySpeech } from '@/services/dictionary-service'

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('prepares only after an explicit load and posts the original clicked reference before polling the same controlled target', async () => {
  vi.useFakeTimers()
  ports.request
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
    1,
    '/api/mini/v1/cards/card/dictionary/pronunciation',
    { method: 'POST', key: 'dictionary-operation-key', body: reference }
  )
  expect(ports.request).toHaveBeenNthCalledWith(
    2,
    '/api/mini/v1/cards/card/dictionary/pronunciation?version_id=version&word=went&line_id=line-1&start=3&end=7',
    {}
  )
  expect(ports.request.mock.calls[0]![1].body).not.toHaveProperty('lemma')
  expect(ports.request.mock.calls[0]![1].body).not.toHaveProperty('speech_text')
  speech.dispose()
  expect(ports.release).toHaveBeenCalledTimes(1)
})
