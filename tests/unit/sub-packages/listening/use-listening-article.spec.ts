// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { FullAudioOptions } from '@/shared/types/audio'
const ports = vi.hoisted(() => ({
  owner: 'owner' as string | null,
  ensure: vi.fn(async () => true),
  background: false,
  options: undefined as FullAudioOptions | undefined,
  load: null as null | ((query: Record<string, string>) => void),
  show: null as null | (() => void),
  hide: null as null | (() => void),
  unload: null as null | (() => void),
  scroll: undefined as undefined | ((event: { scrollTop: number }) => void),
  request: vi.fn(),
  run: vi.fn(),
  download: vi.fn(),
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
  onPageScroll: (cb: typeof ports.scroll) => {
    ports.scroll = cb
  }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ restore: async () => null, ensure: ports.ensure })
}))
vi.mock('@/services/api', () => ({
  session: {
    contentRequest: ports.request,
    request: ports.request,
    identity: () => ports.owner || 'guest:0',
    userId: () => ports.owner
  },
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
vi.mock('@/services/word-audio-file', () => ({ prepareAudioCacheFile: ports.download }))
vi.mock('@/services/audio-port', () => ({
  createAudioPort: (word: boolean, options?: FullAudioOptions) => {
    if (options) ports.options = options
    const events: Record<string, () => void> = {}
    const audio = {
      background: ports.background && !word,
      paused: true,
      src: '',
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      events,
      play: vi.fn(() => {
        audio.paused = false
        events.play?.()
      }),
      pause: vi.fn(() => {
        audio.paused = true
        events.pause?.()
      }),
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
import { analytics } from '@/services/analytics'
import { ApiError } from '@/services/errors'
import { loginReturn } from '@/services/login-return'
import { Routes } from '@/shared/constants/navigation'
import { useListeningArticle } from '@/sub-packages/listening/use-listening-article'
const detail = {
  id: 'a1',
  content_type: 'listening' as const,
  topic_id: 't1',
  category_id: 'c1',
  category_name: '生活',
  category_order: 0,
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
    vocabulary: [
      {
        id: 'word1',
        english: 'This',
        phonetic: '',
        meaning: '这',
        source: {
          start: 0,
          end: 15,
          quote: 'This is a test.',
          word_start: 0,
          word_end: 4,
          word: 'This',
          confirmed: true
        }
      },
      {
        id: 'word2',
        english: 'test',
        phonetic: '',
        meaning: '测试',
        source: {
          start: 0,
          end: 15,
          quote: 'This is a test.',
          word_start: 10,
          word_end: 14,
          word: 'test',
          confirmed: true
        }
      }
    ],
    audio_id: 'audio1',
    image_id: null
  },
  progress: {
    updated_at: '2026-11-07T00:00:00Z',
    version_id: 'v1',
    reading_position: 0,
    translation_open: true,
    audio_position: 12.5,
    playback_rate: 1.5 as const
  },
  timeline: { state: 'missing', words: [] }
}
beforeEach(() => {
  loginReturn.cancel()
  ports.owner = 'owner'
  ports.ensure.mockResolvedValue(true)
  ports.background = false
  ports.options = undefined
  vi.useFakeTimers()
  ports.download.mockResolvedValue({ src: '/local-full', release: vi.fn() })
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
it('retains a background track on hide and restores its real clock without recreating the player', async () => {
  ports.background = true
  const model = await open(),
    full = ports.audio[0]!
  await model.toggle()
  ports.hide?.()
  full.currentTime = 41
  ports.show?.()
  await flushPromises()
  expect(ports.audio).toHaveLength(2)
  expect(model.audio.value.position).toBe(41)
  expect(model.audio.value.status).toBe('playing')
  ports.options!.leave()
  expect(model.audio.value.status).not.toBe('playing')
})

it('authorizes external resume behind the lock screen and refuses a revoked article', async () => {
  ports.background = true
  const model = await open(),
    full = ports.audio[0]!
  await model.toggle()
  await model.toggle()
  ports.hide?.()
  await ports.options!.resume(() => true)
  expect(model.audio.value.status).toBe('playing')
  full.pause()
  ports.request.mockRejectedValueOnce(new ApiError('forbidden', '权限已撤销', 403))
  await ports.options!.resume(() => true)
  expect(model.article.value).toBeNull()
})

it('cancels a pending full source on hide even though native playback is still paused', async () => {
  ports.background = true
  let finish!: (value: unknown) => void
  ports.run.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const model = await open(),
    full = ports.audio[0]!
  const playing = model.toggle()
  await flushPromises()
  expect(model.audio.value.status).toBe('loading')
  ports.hide?.()
  finish({ url: '/late-full', expires_at: '2099-01-01' })
  await playing
  expect(full.play).not.toHaveBeenCalled()
})

it('cancels a page play click when authorization succeeds after hiding', async () => {
  ports.background = true
  const model = await open(),
    full = ports.audio[0]!
  let finish!: (value: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const playing = model.toggle()
  await flushPromises()
  ports.hide?.()
  finish(structuredClone(detail))
  await playing
  expect(full.play).not.toHaveBeenCalled()
  expect(model.audio.value.status).not.toBe('playing')
})

it('applies an in-flight permission revocation after hiding the same background session', async () => {
  ports.background = true
  const model = await open()
  await model.toggle()
  let reject!: (reason: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      })
  )
  await vi.advanceTimersByTimeAsync(30000)
  ports.hide?.()
  reject(new ApiError('forbidden', '权限已撤销', 403))
  await flushPromises()
  expect(model.article.value).toBeNull()
  expect(model.audio.value.status).not.toBe('playing')
})
it('does not load an article or audio for a generic timeline landing', async () => {
  const model = useListeningArticle(ref(true))
  ports.load?.({ target: 'home' })
  ports.show?.()
  await flushPromises()
  expect(ports.request).not.toHaveBeenCalled()
  expect(ports.audio).toHaveLength(0)
  expect(model.article.value).toBeNull()
})
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
  model.translation.value = false
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
it.each(['queue-frozen==', 'queue-frozen%3D%3D'])(
  'keeps the server queue credential intact after loading route value %s',
  async (routeToken) => {
    const model = useListeningArticle()
    ports.load?.({ id: 'a2', queue_token: routeToken })
    ports.show?.()
    await flushPromises()
    ports.request.mockImplementation(async (path: string) =>
      path.includes('/next?')
        ? { article: { ...structuredClone(detail), id: 'a3' }, ended: false, category_id: 'c1' }
        : structuredClone(detail)
    )
    await model.getNext()
    const nextPath = ports.request.mock.calls.find((call) =>
      String(call[0]).includes('/next?')
    )?.[0]
    expect(new URL(String(nextPath), 'https://test.invalid').searchParams.get('queue_token')).toBe(
      'queue-frozen=='
    )
    expect(model.queueToken.value).toBe('queue-frozen==')
    expect(model.nextArticle.value?.id).toBe('a3')
  }
)
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
  expect(model.article.value?.state?.today_completed).toBe(true)
  model.article.value!.access.can_lookup = false
  ports.request.mockClear().mockImplementation(async () => ({
    ...structuredClone(detail),
    access: { ...detail.access, can_lookup: false }
  }))
  await model.lookup({ text: 'This', start: 0, end: 4, word: true })
  expect(model.lookupRestricted.value).toBe(true)
  expect(ports.request.mock.calls.every((call) => String(call[0]).endsWith('/summary'))).toBe(true)
  expect(ports.audio[0]!.pause).not.toHaveBeenCalled()
  model.article.value!.access.can_lookup = true
  ports.request.mockImplementation(async () => structuredClone(detail))
  await model.lookup({ text: 'This', start: 0, end: 4, word: true })
  expect(model.lookupRestricted.value).toBe(false)
})

it('plays preset vocabulary for a free reader without dictionary permission and keeps full audio paused', async () => {
  ports.request.mockImplementation(async () => ({
    ...structuredClone(detail),
    access: { ...detail.access, can_lookup: false }
  }))
  const model = await open()
  expect(model.article.value?.access.can_lookup).toBe(false)
  await model.toggle()
  ports.run.mockResolvedValueOnce({ state: 'ready', url: '/word-ticket' })
  await model.pronounceVocabulary('word1')
  expect(model.article.value?.access.can_lookup).toBe(false)
  expect(model.article.value?.access.is_free).toBe(true)
  expect(ports.request).toHaveBeenCalledWith('/api/mini/v1/listening/articles/a1/summary')
  expect(ports.request.mock.calls.some((call) => String(call[0]).includes('/dictionary'))).toBe(
    false
  )
  expect(ports.run).toHaveBeenCalledWith(
    'listening.word:a1:word1',
    '/api/mini/v1/listening/articles/a1/words/word1/pronunciation',
    'POST',
    { version_id: 'v1' },
    expect.anything()
  )
  expect(model.audio.value.status).toBe('paused')
  expect(model.audio.value.wordStatus).toBe('playing')
  expect(ports.audio[1]!.play).toHaveBeenCalledTimes(1)
  expect(ports.audio[0]!.play).toHaveBeenCalledTimes(1)
})

it('cancels a delayed preset pronunciation when another word is selected', async () => {
  const model = await open()
  let resolve: (value: unknown) => void = () => undefined
  ports.run.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      })
  )
  const first = model.pronounceVocabulary('word1')
  await flushPromises()
  ports.run.mockResolvedValueOnce({ state: 'ready', url: '/word-two' })
  await model.pronounceVocabulary('word2')
  resolve({ state: 'ready', url: '/word-one' })
  await first
  expect(model.audio.value.wordId).toBe('vocabulary:word2')
  expect(ports.audio[1]!.play).toHaveBeenCalledTimes(1)
})

it('keeps a free preset word playing after the periodic check removes only dictionary permission', async () => {
  const model = await open()
  ports.run.mockResolvedValueOnce({ state: 'ready', url: '/preset' })
  await model.pronounceVocabulary('word1')
  ports.request.mockImplementation(async () => ({
    ...structuredClone(detail),
    access: { ...detail.access, can_lookup: false }
  }))
  await vi.advanceTimersByTimeAsync(30000)
  expect(model.article.value?.access.can_lookup).toBe(false)
  expect(model.audio.value.wordStatus).toBe('playing')
  expect(model.audio.value.wordId).toBe('vocabulary:word1')
})

it('immediately removes private content if the preset pronunciation endpoint rejects access', async () => {
  const model = await open()
  await model.toggle()
  ports.run.mockRejectedValueOnce(new ApiError('forbidden', '免费已关闭', 403))
  await model.pronounceVocabulary('word1')
  expect(model.article.value).toBeNull()
  expect(model.error.value).toBe('免费已关闭')
})

it('retries failed preset pronunciation on the same entry without restarting full audio', async () => {
  const model = await open()
  await model.toggle()
  ports.run.mockResolvedValueOnce({ state: 'failed', error_code: 'tts_failed' })
  await model.pronounceVocabulary('word1')
  expect(model.audio.value.wordError).toContain('重试')
  ports.run.mockResolvedValueOnce({ state: 'ready', url: '/retry-preset' })
  await model.pronounceVocabulary('word1')
  expect(model.audio.value.wordStatus).toBe('playing')
  expect(ports.audio[0]!.play).toHaveBeenCalledTimes(1)
})

it('does not issue a preset request or play late audio after leaving during its asynchronous preparation', async () => {
  const model = await open()
  let resolve: (value: unknown) => void = () => undefined
  ports.run.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      })
  )
  const playing = model.pronounceVocabulary('word1')
  await flushPromises()
  ports.hide?.()
  resolve({ state: 'ready', url: '/late-word' })
  await playing
  expect(ports.audio[1]!.play).not.toHaveBeenCalled()
})

it('rechecks dictionary permission before an actual body lookup and never sends a dictionary request after grant expiry', async () => {
  const model = await open()
  ports.request.mockClear().mockImplementation(async () => ({
    ...structuredClone(detail),
    access: { ...detail.access, can_lookup: false }
  }))
  await model.lookup({ text: 'This', start: 0, end: 4, word: true })
  expect(model.lookupRestricted.value).toBe(true)
  expect(model.selection.value).toBeNull()
  expect(ports.request.mock.calls.every((call) => String(call[0]).endsWith('/summary'))).toBe(true)
  expect(model.article.value?.access.can_learn).toBe(true)
})

it('rechecks a newly reported grant expiry at its exact new boundary instead of waiting for the next periodic check', async () => {
  const model = await open()
  ports.request.mockImplementation(async () => ({
    ...structuredClone(detail),
    access: { ...detail.access, expires_at: '2026-10-28T00:00:01Z' }
  }))
  await model.toggle()
  ports.request.mockClear()
  await vi.advanceTimersByTimeAsync(1100)
  expect(ports.request).toHaveBeenCalledWith('/api/mini/v1/listening/articles/a1/summary')
})

it('retains the current safe authorization reason when a permission check locks an open article', async () => {
  const model = await open()
  await model.toggle()
  ports.run.mockClear()
  ports.request.mockResolvedValueOnce({
    ...structuredClone(detail),
    access: {
      ...detail.access,
      can_learn: false,
      can_lookup: false,
      is_free: false,
      reason: 'learning_authorization_required'
    }
  })
  await model.complete()
  expect(model.article.value).toBeNull()
  expect(model.summary.value?.title_zh).toBe('文章')
  expect(model.summary.value?.category_id).toBe('c1')
  expect(model.summary.value?.access).toMatchObject({
    can_learn: false,
    reason: 'learning_authorization_required'
  })
  expect(model.error.value).toContain('学习授权')
  expect(ports.run).not.toHaveBeenCalled()
})

it('prefetches the complete current article without playing, then reuses the local file after authorization', async () => {
  const model = await open()
  expect(ports.download).toHaveBeenCalledTimes(1)
  expect(ports.audio[0]!.play).not.toHaveBeenCalled()
  await model.toggle()
  expect(ports.audio[0]).toHaveProperty('src', '/local-full')
  expect(ports.audio[0]!.play).toHaveBeenCalledTimes(1)
})

it('releases a prefetched full audio file on hide and refuses playback after revocation', async () => {
  const release = vi.fn()
  ports.download.mockResolvedValue({ src: '/private-full', release })
  const model = await open()
  ports.request.mockRejectedValueOnce(
    new ApiError('learning_authorization_required', '授权已撤销', 403)
  )
  await model.toggle()
  expect(ports.audio[0]!.play).not.toHaveBeenCalled()
  expect(release).toHaveBeenCalledTimes(1)
  expect(model.article.value).toBeNull()
})
it('releases the page-owned prefetched full audio file on hide', async () => {
  const release = vi.fn()
  ports.download.mockResolvedValue({ src: '/private-full', release })
  await open()
  ports.hide?.()
  expect(release).toHaveBeenCalledTimes(1)
})

it('reloads a large-category article after hide without sending its frozen queue in the detail URL', async () => {
  const queue = 'A'.repeat(16000)
  ports.request.mockImplementation(async (path: string) => {
    if (path.length > 8192) throw new ApiError('request_failed', '请求暂未成功，请重试', 414)
    return { ...structuredClone(detail), queue_token: queue }
  })
  const model = await open()
  expect(model.article.value?.id).toBe('a1')
  ports.hide?.()
  ports.show?.()
  await flushPromises()
  expect(model.article.value?.id).toBe('a1')
  expect(model.error.value).toBe('')
  expect(model.queueToken.value).toBe(queue)
  await model.load()
  expect(model.article.value?.id).toBe('a1')
})

it('ignores a permission failure from before lock while the resumed article is loading', async () => {
  const model = await open()
  let rejectCheck!: (reason: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectCheck = reject
      })
  )
  const checking = model.toggle()
  await flushPromises()
  ports.hide?.()
  let finishReload!: (value: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishReload = resolve
      })
  )
  ports.show?.()
  await flushPromises()
  rejectCheck(new ApiError('request_failed', '请求暂未成功，请重试', 503))
  await checking
  expect(model.error.value).toBe('')
  expect(model.article.value?.id).toBe('a1')
  finishReload(structuredClone(detail))
  await flushPromises()
  expect(model.busy.value).toBe(false)
  expect(model.article.value?.id).toBe('a1')
  expect(model.audio.value.status).not.toBe('playing')
})

it('ignores a late media rejection after the page has hidden and disposed its preparation', async () => {
  let rejectMedia!: (reason: unknown) => void
  ports.run.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectMedia = reject
      })
  )
  const model = await open()
  ports.hide?.()
  rejectMedia(new ApiError('forbidden', '旧媒体请求已失效', 403))
  await flushPromises()
  expect(model.error.value).toBe('')
  expect(model.article.value?.id).toBe('a1')
  ports.show?.()
  await flushPromises()
  expect(model.article.value?.id).toBe('a1')
  expect(model.error.value).toBe('')
})

it('reads a guest article without personal progress, writes or the login gate', async () => {
  ports.owner = null
  ports.request.mockResolvedValue({
    ...detail,
    state: null,
    progress: null,
    queue_token: null,
    access: { ...detail.access, can_lookup: false }
  })
  const model = useListeningArticle()
  ports.load?.({ id: 'a1' })
  ports.show?.()
  await flushPromises()
  expect(ports.ensure).not.toHaveBeenCalled()
  expect(model.article.value?.id).toBe('a1')
  model.translation.value = true
  ports.hide?.()
  await flushPromises()
  expect(ports.run).not.toHaveBeenCalled()
  expect(ports.drafts.size).toBe(0)
  ports.unload?.()
})

/** 通过真实登录来源服务冻结同版展示，随后切换当前身份 */
const returnFromGuest = async (
  saved: boolean,
  pendingVersion?: string,
  measureReading?: () => Promise<{ anchor: string; top: number; height: number }[]>
) => {
  ports.owner = null
  ports.request.mockResolvedValue({ ...structuredClone(detail), progress: null, state: null })
  const model = await open()
  model.translation.value = true
  model.seek(25)
  model.setRate(1.5)
  ports.scroll?.({ scrollTop: 530 })
  loginReturn.begin(Routes.ARTICLE + '?id=a1')
  ports.hide?.()
  ports.owner = 'owner'
  if (pendingVersion)
    ports.drafts.set('juya-listening-progress-draft:owner:a1:v1', {
      version_id: pendingVersion,
      reading_position: 0,
      translation_open: false,
      audio_position: 9,
      playback_rate: 1.25
    })
  vi.mocked(uni.pageScrollTo).mockClear()
  ports.request.mockResolvedValue({
    ...structuredClone(detail),
    progress: {
      version_id: 'v1',
      reading_position: saved ? 10 : 0,
      translation_open: false,
      audio_position: saved ? 7 : 0,
      playback_rate: 1,
      updated_at: saved ? '2026-11-07T00:00:00Z' : null
    }
  })
  if (measureReading) model.bodyRef.value = { measureReading } as never
  loginReturn.succeed()
  ports.show?.()
  await flushPromises()
  return model
}

it('restores guest display when the actual signed-in progress has no saved row', async () => {
  const model = await returnFromGuest(false)
  expect(model.translation.value).toBe(true)
  expect(model.audio.value).toMatchObject({ position: 25, rate: 1.5 })
  expect(uni.pageScrollTo).toHaveBeenCalledWith(expect.objectContaining({ scrollTop: 530 }))
  await model.save()
  expect(
    ports.run.mock.calls.filter(([action]) => String(action).startsWith('listening-progress:'))
  ).toHaveLength(0)
})

it.each([false, true])(
  'keeps late clamped and repeated restoration scrolls read-only with saved history=%s',
  async (saved) => {
    const model = await returnFromGuest(saved)
    model.bodyRef.value = {
      measureReading: async () => [{ anchor: '10', top: 640, height: 40 }]
    } as never
    // 重新加载后测量发生在 nextTick 之后，原生回调又晚于异步测量
    await model.load()
    await flushPromises()
    ports.run.mockClear()
    ports.scroll?.({ scrollTop: 490 })
    ports.scroll?.({ scrollTop: 480 })
    await vi.advanceTimersByTimeAsync(150)
    ports.hide?.()
    await flushPromises()
    expect(
      ports.run.mock.calls.filter(([action]) => String(action).startsWith('listening-progress:'))
    ).toHaveLength(0)
  }
)

it('gives actual saved account history priority over guest display', async () => {
  const model = await returnFromGuest(true)
  expect(model.translation.value).toBe(false)
  expect(model.audio.value).toMatchObject({ position: 7, rate: 1 })
  expect(uni.pageScrollTo).not.toHaveBeenCalledWith(expect.objectContaining({ scrollTop: 530 }))
})

it.each(['scroll', 'translation', 'rate', 'seek'])(
  'saves only after a new user %s interaction following display restoration',
  async (action) => {
    const model = await returnFromGuest(false)
    ports.run.mockClear()
    if (action === 'scroll') {
      model.startUserScroll(new Event('touchmove'))
      ports.scroll?.({ scrollTop: 600 })
    } else if (action === 'translation') model.toggleTranslation()
    else if (action === 'rate') model.setRate(1.25)
    else model.seek(30)
    await model.save()
    expect(
      ports.run.mock.calls.filter(([key]) => String(key).startsWith('listening-progress:'))
    ).toHaveLength(1)
  }
)

it('ignores a stale-version pending draft when choosing whether to restore guest display', async () => {
  const model = await returnFromGuest(false, 'old-version')
  expect(model.translation.value).toBe(true)
  expect(model.audio.value.position).toBe(25)
})

it('keeps actual deferred anchor measurement and subsequent native callbacks read-only on login return', async () => {
  let finish!: (blocks: { anchor: string; top: number; height: number }[]) => void
  const blocks = new Promise<{ anchor: string; top: number; height: number }[]>((resolve) => {
    finish = resolve
  })
  const model = await returnFromGuest(true, undefined, () => blocks)
  expect(uni.pageScrollTo).not.toHaveBeenCalled()
  finish([{ anchor: '10', top: 110, height: 40 }])
  await flushPromises()
  expect(uni.pageScrollTo).toHaveBeenCalledWith({ scrollTop: 530, duration: 0 })
  ports.scroll?.({ scrollTop: 490 })
  await vi.advanceTimersByTimeAsync(150)
  ports.scroll?.({ scrollTop: 480 })
  await model.save()
  expect(
    ports.run.mock.calls.filter(([key]) => String(key).startsWith('listening-progress:'))
  ).toHaveLength(0)
})

it('gives a same-account same-version pending draft priority over guest display', async () => {
  const model = await returnFromGuest(false, 'v1')
  expect(model.translation.value).toBe(false)
  expect(model.audio.value).toMatchObject({ position: 9, rate: 1.25 })
})

it('captures the selected pending native rate for read-only login display restoration', async () => {
  const model = await open()
  model.audio.value = { ...model.audio.value, rate: 1, pendingRate: 1.75 }
  loginReturn.begin(Routes.ARTICLE + '?id=a1')
  loginReturn.succeed()
  expect(loginReturn.take(Routes.ARTICLE, 'a1')?.playbackRate).toBe(1.75)
})

it('records identified audio actions but never content exposure or restored-progress actions', async () => {
  const track = vi.spyOn(analytics, 'track')
  try {
    const model = await open()
    expect(track.mock.calls.some(([event]) => String(event) === 'content_view')).toBe(false)
    expect(track.mock.calls.filter(([event]) => event.startsWith('audio_'))).toEqual([])
    await model.toggle()
    await model.toggle()
    ports.run.mockResolvedValueOnce({ state: 'ready', url: '/word-ticket' })
    await model.pronounceVocabulary('word1')
    const audio = track.mock.calls.filter(([event]) => event.startsWith('audio_'))
    expect(audio.map(([event]) => event)).toEqual(['audio_play', 'audio_pause', 'audio_play'])
    expect(audio[0]?.[1]).toMatchObject({
      content_type: 'listening',
      content_id: 'a1',
      version_id: 'v1',
      audio_kind: 'full'
    })
    expect(audio[2]?.[1]).toMatchObject({ content_id: 'a1', word_id: 'vocabulary:word1' })
  } finally {
    track.mockRestore()
  }
})

it('records manual translation and the current dictionary result without raw words', async () => {
  const track = vi.spyOn(analytics, 'track')
  try {
    const model = await open()
    expect(track.mock.calls.filter(([event]) => event === 'translation_toggle')).toHaveLength(0)
    model.toggleTranslation()
    ports.request.mockImplementation(async (path: string) =>
      path.includes('/dictionary?')
        ? { word: 'private-word', definitions: [] }
        : structuredClone(detail)
    )
    await model.lookup({ text: 'private-word', start: 0, end: 4 } as never)
    expect(track.mock.calls.filter(([event]) => event === 'translation_toggle')).toEqual([
      ['translation_toggle', expect.objectContaining({ content_id: 'a1', expanded: 0 })]
    ])
    expect(track.mock.calls.filter(([event]) => event === 'dictionary_success')).toHaveLength(1)
    expect(JSON.stringify(track.mock.calls)).not.toContain('private-word')
  } finally {
    track.mockRestore()
  }
})

it('records a denied manual lookup once and never records background permission checks as actions', async () => {
  const track = vi.spyOn(analytics, 'track')
  try {
    const model = await open()
    ports.request.mockResolvedValue({
      ...structuredClone(detail),
      access: { ...detail.access, can_lookup: false }
    })
    await model.lookup({ text: 'private-word', start: 0, end: 4 } as never)
    expect(track.mock.calls.filter(([event]) => event === 'business_error')).toEqual([
      [
        'business_error',
        expect.objectContaining({ action: 'dictionary_lookup', error_kind: 'forbidden' })
      ]
    ])
  } finally {
    track.mockRestore()
  }
})

it('records failed manual content retries but keeps foreground refresh failures silent', async () => {
  const track = vi.spyOn(analytics, 'track')
  try {
    ports.request.mockRejectedValue(new ApiError('network', 'private'))
    const model = await open()
    expect(track.mock.calls.filter(([event]) => event === 'business_error')).toHaveLength(1)
    await model.retryLoad()
    expect(track.mock.calls.filter(([event]) => event === 'business_error')).toHaveLength(2)
    ports.hide?.()
    ports.show?.()
    await flushPromises()
    expect(track.mock.calls.filter(([event]) => event === 'business_error')).toHaveLength(2)
  } finally {
    track.mockRestore()
  }
})
