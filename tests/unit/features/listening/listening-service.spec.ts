import { beforeEach, expect, it, vi } from 'vitest'

import { analytics } from '@/services/analytics'
const ports = vi.hoisted(() => ({
  pending: vi.fn(() => false),
  recover: vi.fn(),
  run: vi.fn(),
  request: vi.fn()
}))
vi.mock('@/services/api', () => ({
  operations: { pending: ports.pending, recover: ports.recover, run: ports.run },
  session: {
    contentRequest: ports.request,
    request: ports.request,
    identity: () => 'owner',
    userId: () => 'owner'
  }
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

it('records list content clicks while leaving next-article tracking to its explicit caller', async () => {
  const track = vi.spyOn(analytics, 'track')
  vi.stubGlobal('uni', {
    navigateTo: ({ success }: { success: () => void }) => success(),
    redirectTo: ({ success }: { success: () => void }) => success()
  })
  try {
    const { openListeningArticle } = await import('@/features/listening/listening-service')
    await openListeningArticle({ id: 'a1', version_id: 'v1' } as never)
    await openListeningArticle({ id: 'a2', version_id: 'v2' } as never, 'private-queue', true)
    expect(track.mock.calls.filter(([event]) => event === 'content_click')).toEqual([
      ['content_click', expect.objectContaining({ content_type: 'listening', content_id: 'a1' })]
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain('private-queue')
  } finally {
    track.mockRestore()
    vi.unstubAllGlobals()
  }
})
