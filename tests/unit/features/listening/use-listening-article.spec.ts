// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: null as null | ((query: Record<string, string>) => void),
  show: null as null | (() => void),
  hide: null as null | (() => void),
  unload: null as null | (() => void),
  request: vi.fn(),
  run: vi.fn(),
  drafts: new Map<string, unknown>(),
  audio: [] as {
    currentTime: number
    duration: number
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    events: Record<string, () => void>
  }[]
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: typeof ports.load) => {
    ports.load = cb
  },
  onShow: (cb: typeof ports.show) => {
    ports.show = cb
  },
  onHide: (cb: typeof ports.hide) => {
    ports.hide = cb
  },
  onUnload: (cb: typeof ports.unload) => {
    ports.unload = cb
  },
  onPageScroll: vi.fn()
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'owner' },
  operations: { pending: () => false, run: ports.run },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/platform', () => ({
  resourceURL: (path: string) => path,
  storage: {
    get: (key: string) => ports.drafts.get(key),
    set: (key: string, value: unknown) => ports.drafts.set(key, value),
    remove: (key: string) => ports.drafts.delete(key)
  }
}))
vi.mock('@/services/audio-port', () => ({
  createAudioPort: () => {
    const events: Record<string, () => void> = {}
    const audio = {
      src: '',
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      events,
      play: vi.fn(() => events.play?.()),
      pause: vi.fn(() => events.pause?.()),
      stop: vi.fn(),
      destroy: vi.fn(),
      seek: (value: number) => {
        audio.currentTime = value
      },
      onPlay: (cb: () => void) => {
        events.play = cb
      },
      onPause: (cb: () => void) => {
        events.pause = cb
      },
      onTimeUpdate: (cb: () => void) => {
        events.time = cb
      },
      onEnded: (cb: () => void) => {
        events.ended = cb
      },
      onError: (cb: () => void) => {
        events.error = cb
      }
    }
    ports.audio.push(audio)
    return audio
  }
}))
import { useListeningArticle } from '@/features/listening/use-listening-article'
import { ApiError } from '@/services/errors'
const detail = {
  id: 'a1',
  content_type: 'listening' as const,
  topic_id: 't1',
  title_zh: '文章',
  title_en: 'Article',
  tags: [],
  word_count: 4,
  version_id: 'v1',
  available: true,
  thumbnail_url: null,
  queue_token: 'queue-frozen',
  access: {
    can_learn: true,
    can_lookup: true,
    is_free: true,
    reason: null,
    server_now: '2026-10-28T00:00:00Z',
    expires_at: null,
    version: 'access1'
  },
  state: { favorite: false, completed: false, today_completed: false },
  payload: {
    title_zh: '文章',
    title_en: 'Article',
    tags: [],
    body_en: 'This is a test.',
    translation_zh: '这是一段测试。',
    expressions: [],
    word_meanings: [],
    audio_id: 'audio1',
    image_id: null
  },
  progress: {
    version_id: 'v1',
    reading_position: 0,
    translation_open: true,
    audio_position: 12.5,
    playback_rate: 1.5 as const
  },
  timeline: { state: 'missing', words: [] }
}
beforeEach(() => {
  vi.useFakeTimers()
  ports.audio.length = 0
  ports.drafts.clear()
  vi.stubGlobal('uni', { pageScrollTo: vi.fn(), showToast: vi.fn() })
  ports.request.mockImplementation(async () => structuredClone(detail))
  ports.run.mockImplementation(async () => ({
    url: '/api/mini/v1/listening/media',
    expires_at: '2099-01-01'
  }))
})
afterEach(() => {
  ports.unload?.()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
/** 初始化真实文章组合逻辑与可控原生媒体边界 */
const open = async () => {
  const model = useListeningArticle()
  ports.load?.({ id: 'a1' })
  ports.show?.()
  await flushPromises()
  return model
}
it('restores the server version progress paused and freezes the actual media clock during pause', async () => {
  const model = await open(),
    full = ports.audio[0]!
  expect(model.translation.value).toBe(true)
  expect(model.audio.value.position).toBe(12.5)
  expect(model.audio.value.rate).toBe(1.5)
  expect(full.play).not.toHaveBeenCalled()
  await model.toggle()
  expect(full.currentTime).toBe(12.5)
  expect(full.play).toHaveBeenCalledTimes(1)
  full.currentTime = 13.25
  await vi.advanceTimersByTimeAsync(80)
  expect(model.audio.value.position).toBe(13.25)
  await model.toggle()
  await vi.advanceTimersByTimeAsync(1000)
  expect(model.audio.value.position).toBe(13.25)
  expect(model.audio.value.status).toBe('paused')
})
it('only shows word definitions while full audio continues, and pauses full audio only for pronunciation', async () => {
  const model = await open(),
    full = ports.audio[0]!
  await model.toggle()
  const pauses = full.pause.mock.calls.length
  await model.lookup({ text: 'This', start: 0, end: 4, word: true })
  expect(full.pause).toHaveBeenCalledTimes(pauses)
  expect(model.audio.value.status).toBe('playing')
  await model.pronounce()
  expect(full.pause.mock.calls.length).toBeGreaterThan(pauses)
  model.closeDictionary()
  expect(model.audio.value.status).toBe('paused')
  expect(full.play).toHaveBeenCalledTimes(1)
})
it('stops both private tracks and removes body if revalidation is denied, retaining only a safe summary', async () => {
  const model = await open()
  await model.toggle()
  ports.request.mockRejectedValueOnce(new ApiError('forbidden', '当前文章受限', 403))
  await model.complete()
  expect(model.article.value).toBeNull()
  expect(model.error.value).toBe('当前文章受限')
  expect(model.summary.value?.title_zh).toBe('文章')
})
it('playback completion never writes a learning completion or checkin', async () => {
  const model = await open()
  await model.toggle()
  ports.run.mockClear()
  ports.audio[0]!.events.ended?.()
  expect(model.completed.value).toBe(false)
  expect(ports.run).not.toHaveBeenCalled()
  expect(model.audio.value.status).toBe('ended')
})
it('retains a failed save as a same-account same-version draft and exposes an explicit retry', async () => {
  const model = await open()
  model.translation.value = false
  ports.run.mockRejectedValueOnce(new ApiError('network_unknown', '网络连接中断，请重试以确认结果'))
  await model.save()
  expect(model.saveError.value).toContain('网络连接中断')
  expect([...ports.drafts.values()][0]).toMatchObject({
    version_id: 'v1',
    translation_open: false,
    audio_position: 12.5
  })
  ports.run.mockResolvedValueOnce({
    version_id: 'v1',
    translation_open: false,
    audio_position: 12.5
  })
  await model.save()
  expect(model.saveError.value).toBe('')
  expect(ports.drafts.size).toBe(0)
})

it('replaces the current detail after saving progress and preserves the frozen queue', async () => {
  const redirect = vi.fn((options: { success: () => void }) => options.success())
  vi.stubGlobal('uni', { pageScrollTo: vi.fn(), showToast: vi.fn(), redirectTo: redirect })
  const model = await open()
  model.nextArticle.value = { ...detail, id: 'a2' }
  ports.run.mockClear()
  await model.advance()
  expect(ports.run).toHaveBeenCalledWith(
    'listening-progress:a1',
    expect.any(String),
    'PUT',
    expect.objectContaining({ version_id: 'v1' }),
    expect.anything()
  )
  expect(redirect).toHaveBeenCalledWith(
    expect.objectContaining({
      url: '/sub-packages/listening/article?id=a2&queue_token=queue-frozen'
    })
  )
})
it('retains the current article and exposes retry when next navigation fails', async () => {
  vi.stubGlobal('uni', {
    pageScrollTo: vi.fn(),
    showToast: vi.fn(),
    redirectTo: (options: { fail: () => void }) => options.fail()
  })
  const model = await open()
  model.nextArticle.value = { ...detail, id: 'a2' }
  await model.advance()
  expect(model.article.value?.id).toBe('a1')
  expect(model.actionError.value).toContain('下一篇')
})

it('preserves the confirmed completion result for the completion dialog and exposes an inline lookup restriction', async () => {
  const model = await open()
  ports.run.mockResolvedValueOnce({
    article_id: 'a1',
    first_checkin_today: true,
    first_completion: true,
    state: { favorite: false, completed: true, today_completed: true },
    statistics: { checkin_days: 7 }
  })
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/next?') ? { article: null, ended: true } : structuredClone(detail)
  )
  await model.complete()
  expect(model.completionResult.value?.first_checkin_today).toBe(true)
  expect(model.article.value?.state.today_completed).toBe(true)
  model.article.value!.access.can_lookup = false
  ports.request.mockClear()
  await model.lookup({ text: 'This', start: 0, end: 4, word: true })
  expect(model.lookupRestricted.value).toBe(true)
  expect(ports.request).not.toHaveBeenCalled()
  expect(ports.audio[0]!.pause).not.toHaveBeenCalled()
  model.article.value!.access.can_lookup = true
  await model.lookup({ text: 'This', start: 0, end: 4, word: true })
  expect(model.lookupRestricted.value).toBe(false)
})
