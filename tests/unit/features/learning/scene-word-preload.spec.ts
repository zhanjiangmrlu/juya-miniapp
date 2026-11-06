// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const ports = vi.hoisted(() => ({
  noteDownload: vi.fn(),
  noteOpen: vi.fn(),
  load: null as null | ((query: Record<string, string>) => void),
  hide: null as null | (() => void),
  show: null as null | (() => void),
  unload: null as null | (() => void),
  expired: null as null | (() => void),
  request: vi.fn(),
  file: vi.fn(),
  media: vi.fn(),
  fullFile: vi.fn(),
  fullRelease: vi.fn(),
  release: vi.fn(),
  unsubscribe: vi.fn(),
  ensure: vi.fn(async (_target?: string) => true),
  account: null as null | { profile: { id: string } | null; restore: () => Promise<unknown> },
  tracks: [] as { src: string; play: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[]
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onPageScroll: vi.fn(),
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onHide: (callback: typeof ports.hide) => {
    ports.hide = callback
  },
  onUnload: (callback: typeof ports.unload) => {
    ports.unload = callback
  }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => Object.assign(ports.account!, { ensure: ports.ensure })
}))
vi.mock('@/services/api', () => ({
  operations: { pending: () => false },
  session: { request: ports.request, userId: () => ports.account?.profile?.id || null },
  onSessionExpired: (callback: () => void) => {
    ports.expired = callback
    return ports.unsubscribe
  }
}))
vi.mock('@/services/platform', () => ({
  sendPublicRequest: vi.fn(async () => ({ status: 503, data: {} })),
  operationKey: () => 'key',
  resourceURL: (url: string) => url
}))
vi.mock('@/services/word-audio-file', () => ({
  prepareWordAudioFile: ports.file,
  prepareAudioCacheFile: ports.fullFile
}))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/sub-packages/scenes/study-note-platform', () => ({
  downloadStudyNote: ports.noteDownload,
  openStudyNoteDocument: ports.noteOpen
}))
vi.mock('@/services/audio-port', () => ({
  createAudioPort: () => {
    const track = {
      src: '',
      currentTime: 0,
      duration: 10,
      playbackRate: 1,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      destroy: vi.fn(),
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onEnded: vi.fn(),
      onError: vi.fn(),
      onTimeUpdate: vi.fn()
    }
    ports.tracks.push(track)
    return track
  }
}))

/** 返回场景测试所需的最小已发布内容 */
const scene = () => ({
  id: 'card',
  card_id: 'card',
  version_id: 'v1',
  audio_duration: 10,
  state: { favorite: false, completed: false, today_completed: false },
  content: {
    name: '场景',
    title_en: '',
    image_id: null,
    audio_id: 'full',
    dialogue: [],
    vocabulary: [
      { id: 'one', english: 'hello' },
      { id: 'two', english: 'world' }
    ]
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  ports.tracks.length = 0
  ports.account = reactive({ profile: { id: 'learner' }, restore: vi.fn(async () => null) })
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/pronunciation')
      ? { state: 'ready', url: '/api/mini/v1/pronunciation/ticket' }
      : scene()
  )
  ports.file.mockResolvedValue({ src: 'wxfile://word.mp3', release: ports.release })
  ports.media.mockResolvedValue('/api/mini/v1/media/full-ticket')
  ports.fullFile.mockResolvedValue({ src: 'wxfile://full.mp3', release: ports.fullRelease })
})
afterEach(() => vi.useRealTimers())

/** 加载真正的场景页面，并只替换展示组件 */
const open = async () => {
  const { default: Detail } = await import('@/sub-packages/scenes/detail.vue')
  const page = shallowMount(Detail, {
    global: { stubs: { AppPage: { template: '<div><slot /><slot name="footer" /></div>' } } }
  })
  ports.load?.({ id: 'card' })
  await flushPromises()
  return page
}

it('prepares the current vocabulary after showing the scene and plays locally without another request', async () => {
  const page = await open()
  expect(ports.file).toHaveBeenCalledTimes(2)
  expect(ports.tracks).toHaveLength(2)
  expect(ports.tracks.every((track) => track.play.mock.calls.length === 0)).toBe(true)
  const calls = ports.request.mock.calls.length
  page.getComponent({ name: 'scene-vocabulary' }).vm.$emit('play', 'one')
  expect(ports.tracks[1]!.src).toBe('wxfile://word.mp3')
  expect(ports.tracks[1]!.play).toHaveBeenCalledTimes(1)
  expect(ports.request).toHaveBeenCalledTimes(calls)
  expect(ports.file).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('prepares complete audio independently and plays its cached file in the original click event', async () => {
  const page = await open()
  expect(ports.media).toHaveBeenCalledExactlyOnceWith('card', 'full', 'v1', false, true)
  expect(ports.fullFile).toHaveBeenCalledTimes(1)
  expect(ports.tracks[0]!.play).not.toHaveBeenCalled()
  const requests = ports.request.mock.calls.length
  page.getComponent({ name: 'scene-audio-player' }).vm.$emit('toggle')
  expect(ports.tracks[0]!.src).toBe('wxfile://full.mp3')
  expect(ports.tracks[0]!.play).toHaveBeenCalledTimes(1)
  expect(ports.request).toHaveBeenCalledTimes(requests)
  expect(ports.media).toHaveBeenCalledTimes(1)
  ports.unload?.()
  expect(ports.fullRelease).toHaveBeenCalledTimes(1)
  page.unmount()
})

it('streams immediately when clicked during a slow full download and rejects its late file', async () => {
  let finish!: (value: { src: string; release: () => void }) => void
  const cancelled = vi.fn()
  ports.fullFile.mockImplementationOnce((_url, task) => {
    task.onCancel(cancelled)
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const page = await open()
  page.getComponent({ name: 'scene-audio-player' }).vm.$emit('toggle')
  expect(cancelled).toHaveBeenCalledTimes(1)
  expect(ports.tracks[0]!.src).toBe('/api/mini/v1/media/full-ticket')
  expect(ports.tracks[0]!.play).toHaveBeenCalledTimes(1)
  finish({ src: 'wxfile://late-full', release: ports.fullRelease })
  await flushPromises()
  expect(ports.fullRelease).toHaveBeenCalledTimes(1)
  expect(ports.tracks[0]!.src).toBe('/api/mini/v1/media/full-ticket')
  ports.unload?.()
  page.unmount()
})

it('cleans audio and files on hide, rebuilds on return, and unsubscribes on unload', async () => {
  const page = await open()
  ports.hide?.()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(ports.fullRelease).toHaveBeenCalledTimes(1)
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 1)).toBe(true)
  ports.show?.()
  await flushPromises()
  expect(ports.file).toHaveBeenCalledTimes(4)
  ports.unload?.()
  expect(ports.unsubscribe).toHaveBeenCalledTimes(1)
  page.unmount()
})

it('does not start late scene preparation while hidden, and prepares it when shown again', async () => {
  let finish!: (value: ReturnType<typeof scene>) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const page = await open()
  ports.hide?.()
  finish(scene())
  await flushPromises()
  expect(ports.file).not.toHaveBeenCalled()
  expect(ports.tracks).toHaveLength(0)
  ports.show?.()
  await flushPromises()
  expect(ports.file).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('disposes cached local audio when the authenticated session expires', async () => {
  const page = await open()
  ports.expired?.()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 1)).toBe(true)
  ports.unload?.()
  page.unmount()
})

it('does not reuse a cached local file after another session logs into the same account', async () => {
  const page = await open()
  ports.account!.profile = { id: 'learner' }
  await flushPromises()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 1)).toBe(true)
  ports.unload?.()
  page.unmount()
})

it('discards prepared audio after the server reports a changed publication', async () => {
  const { ApiError } = await import('@/services/errors')
  const page = await open()
  ports.request.mockRejectedValueOnce(new ApiError('version_changed', '内容已变化', 409))
  ports.show?.()
  await flushPromises()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(page.text()).toContain('内容已更新')
  ports.unload?.()
  page.unmount()
})

/** 使用真实权限结构打开页面，音源预加载不替代每次点击验权 */
const permittedScene = () => ({
  ...scene(),
  access: {
    can_learn: true,
    can_lookup: true,
    is_free: false,
    reason: null,
    version: 'access-v1',
    server_now: '2026-10-27T12:00:00Z',
    expires_at: null
  }
})

it('shows word loading immediately while the real permission response is pending and plays only after it succeeds', async () => {
  const current = permittedScene()
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/access')
      ? { access: current.access, summary: current }
      : path.includes('/pronunciation')
        ? { state: 'ready', url: '/api/mini/v1/pronunciation/ticket' }
        : current
  )
  const page = await open()
  let finish!: (result: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  page.getComponent({ name: 'scene-vocabulary' }).vm.$emit('play', 'one')
  await page.vm.$nextTick()
  expect(page.getComponent({ name: 'scene-vocabulary' }).props('state').wordStatus).toBe('loading')
  expect(ports.tracks[1]!.play).not.toHaveBeenCalled()
  finish({ access: current.access, summary: current })
  await flushPromises()
  expect(ports.tracks[1]!.play).toHaveBeenCalledOnce()
  expect(ports.file).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('does not play a downloaded word after the click permission is revoked', async () => {
  const current = permittedScene()
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/access')
      ? { access: current.access, summary: current }
      : path.includes('/pronunciation')
        ? { state: 'ready', url: '/api/mini/v1/pronunciation/ticket' }
        : current
  )
  const page = await open()
  ports.request.mockResolvedValueOnce({
    access: { ...current.access, version: 'revoked', can_learn: false, can_lookup: false },
    summary: current
  })
  page.getComponent({ name: 'scene-vocabulary' }).vm.$emit('play', 'one')
  await flushPromises()
  expect(ports.tracks.every((value) => value.play.mock.calls.length === 0)).toBe(true)
  expect(ports.release).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('opens a fresh native note without replacing audio and keeps all playback paused through document lifecycle', async () => {
  const current = {
    ...scene(),
    study_note: {
      state: 'ready',
      media_id: 'pdf',
      version_id: 'note-v1',
      filename: 'note.pdf',
      size: 1
    }
  }
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/url?')
      ? { url: '/api/mini/v1/note-ticket' }
      : path.includes('/pronunciation')
        ? { state: 'ready', url: '/api/mini/v1/pronunciation/ticket' }
        : current
  )
  ports.noteDownload.mockResolvedValue({ path: 'wxfile://note.pdf', release: ports.release })
  ports.noteOpen.mockResolvedValue(undefined)
  const page = await open()
  const before = ports.request.mock.calls.length
  await page.get('.note-entry').trigger('click')
  await flushPromises()
  expect(ports.request.mock.calls.slice(before).map(([path]) => path)).toEqual([
    '/api/mini/v1/cards/card?mark_started=false',
    '/api/mini/v1/cards/card/media/pdf/url?purpose=study_note&study_note_version_id=note-v1',
    '/api/mini/v1/cards/card?mark_started=false'
  ])
  expect(ports.noteOpen).toHaveBeenCalledWith('wxfile://note.pdf')
  expect(ports.tracks).toHaveLength(2)
  ports.hide?.()
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 0)).toBe(true)
  page.getComponent({ name: 'scene-audio-player' }).vm.$emit('toggle')
  await flushPromises()
  expect(ports.tracks[0]!.play).not.toHaveBeenCalled()
  const requestCount = ports.request.mock.calls.length
  ports.show?.()
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(requestCount)
  expect(ports.tracks).toHaveLength(2)
  expect(ports.tracks[0]!.play).not.toHaveBeenCalled()
  page.getComponent({ name: 'scene-audio-player' }).vm.$emit('toggle')
  await flushPromises()
  expect(ports.tracks[0]!.play).toHaveBeenCalledOnce()
  ports.unload?.()
  page.unmount()
})

it('restores the note login intent with read-only detail requests before automatically opening its current PDF', async () => {
  const current = {
    ...scene(),
    study_note: {
      state: 'ready',
      media_id: 'pdf',
      version_id: 'note-v2',
      filename: 'note.pdf',
      size: 1
    }
  }
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/url?') ? { url: '/api/mini/v1/new-ticket' } : current
  )
  ports.noteDownload.mockResolvedValue({ path: 'wxfile://new.pdf', release: ports.release })
  ports.noteOpen.mockResolvedValue(undefined)
  const { default: Detail } = await import('@/sub-packages/scenes/detail.vue')
  const page = shallowMount(Detail, {
    global: { stubs: { AppPage: { template: '<div><slot /></div>' } } }
  })
  ports.load?.({ id: 'card', intent: 'study_note', source: 'learning_notes' })
  await flushPromises()
  const details = ports.request.mock.calls
    .map(([path]) => path)
    .filter((path) => /^\/api\/mini\/v1\/cards\/card(?:\?|$)/.test(path))
  expect(details.length).toBeGreaterThanOrEqual(2)
  expect(details.every((path) => path.includes('mark_started=false'))).toBe(true)
  expect(ports.noteOpen).toHaveBeenCalledOnce()
  expect(ports.ensure.mock.calls[0]?.[0]).toContain('intent=study_note')
  ports.unload?.()
  page.unmount()
})

it('retains the PDF login intent when a read-only body refresh receives 401', async () => {
  const { ApiError } = await import('@/services/errors')
  const first = {
      ...scene(),
      study_note: {
        state: 'ready',
        media_id: 'pdf',
        version_id: 'note',
        filename: 'note.pdf',
        size: 1
      }
    },
    updated = { ...first, version_id: 'v2' }
  let detailReads = 0
  ports.request.mockImplementation(async (path: string) => {
    if (path.includes('/pronunciation'))
      return { state: 'ready', url: '/api/mini/v1/pronunciation/ticket' }
    detailReads++
    if (detailReads === 1) return first
    if (detailReads === 2) return updated
    throw new ApiError('unauthenticated', '请重新登录', 401)
  })
  const { default: Detail } = await import('@/sub-packages/scenes/detail.vue')
  const page = shallowMount(Detail, {
    global: { stubs: { AppPage: { template: '<div><slot /></div>' } } }
  })
  ports.load?.({ id: 'card', source: 'learning_notes' })
  await flushPromises()
  await page.get('.note-entry').trigger('click')
  await flushPromises()
  expect(ports.ensure.mock.calls.at(-1)?.[0]).toBe(
    '/sub-packages/scenes/detail?id=card&intent=study_note&source=learning_notes'
  )
  expect(
    ports.request.mock.calls
      .filter(([path]) => !path.includes('/pronunciation'))
      .slice(1)
      .every(([path]) => path.includes('mark_started=false'))
  ).toBe(true)
  expect(ports.noteOpen).not.toHaveBeenCalled()
  ports.unload?.()
  page.unmount()
})
