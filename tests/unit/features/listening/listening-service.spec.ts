import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  pending: vi.fn(() => false),
  recover: vi.fn(),
  run: vi.fn(),
  request: vi.fn()
}))
vi.mock('@/services/api', () => ({
  operations: { pending: ports.pending, recover: ports.recover, run: ports.run },
  session: { request: ports.request, userId: () => 'owner' }
}))
vi.mock('@/services/platform', () => ({ resourceURL: (path: string) => path }))
import { listeningThumbnail, saveListeningProgress } from '@/features/listening/listening-service'
beforeEach(() => vi.clearAllMocks())
it('confirms the previous unknown save and then persists the latest reading position before reporting synchronized', async () => {
  ports.pending.mockReturnValue(true)
  ports.recover.mockResolvedValue({
    version_id: 'v1',
    reading_position: 10,
    translation_open: false,
    audio_position: 2,
    playback_rate: 1
  })
  const latest = {
    version_id: 'v1',
    reading_position: 100,
    translation_open: true,
    audio_position: 5,
    playback_rate: 1.5 as const
  }
  ports.run.mockResolvedValue(latest)
  expect(await saveListeningProgress('article', latest)).toEqual(latest)
  expect(ports.run).toHaveBeenCalledWith(
    'listening-progress:article',
    '/api/mini/v1/listening/articles/article/progress',
    'PUT',
    latest,
    { persistBody: true }
  )
})
it('exchanges the protected thumbnail path for a session-bound short image ticket', async () => {
  ports.request.mockResolvedValue({ url: '/api/mini/v1/listening/media/safe-ticket' })
  expect(
    await listeningThumbnail('/api/mini/v1/listening/articles/a/thumbnail?version_id=v1')
  ).toBe('/api/mini/v1/listening/media/safe-ticket')
  expect(ports.request).toHaveBeenCalledWith(
    '/api/mini/v1/listening/articles/a/thumbnail-ticket?version_id=v1'
  )
})
