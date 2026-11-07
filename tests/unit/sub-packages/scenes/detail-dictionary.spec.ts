// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { AudioPort, FullAudioOptions } from '@/shared/types/audio'
const ports = vi.hoisted(() => ({
  background: false,
  options: undefined as FullAudioOptions | undefined,
  load: undefined as undefined | ((query: { id: string }) => void),
  show: undefined as undefined | (() => void),
  hide: undefined as undefined | (() => void),
  scroll: undefined as undefined | ((event: { scrollTop: number }) => void),
  unload: undefined as undefined | (() => void),
  release: vi.fn(),
  fullReady: vi.fn(),
  run: vi.fn(),
  request: vi.fn(),
  invalidate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
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
  },
  onPageScroll: (callback: typeof ports.scroll) => {
    ports.scroll = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: {
    contentRequest: ports.request,
    request: ports.request,
    identity: () => 'owner',
    userId: () => 'owner'
  },
  operations: { pending: () => false, run: ports.run },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    profile: { id: 'owner' },
    restore: async () => null,
    ensure: async () => true
  })
}))
vi.mock('@/services/full-audio-preparation', () => ({
  createFullAudioPreparation: () => ({
    prefetch: ports.fullReady,
    load: () => '/full',
    dispose: vi.fn()
  })
}))
vi.mock('@/services/word-audio-file', () => ({
  prepareAudioCacheFile: async () => ({ src: '/full', release: vi.fn() }),
  prepareWordAudioFile: async () => ({ src: '/word', release: ports.release })
}))
vi.mock('@/services/audio-port', () => ({
  createAudioPort: (word: boolean, options?: FullAudioOptions) => {
    if (options) ports.options = options
    const track = createTrack()
    Object.assign(track, { background: ports.background && !word })
    return track
  }
}))

import { ApiError } from '@/services/errors'
import SceneDetail from '@/sub-packages/scenes/detail.vue'

const tracks: (AudioPort & { playing: boolean; callbacks: Record<string, () => void> })[] = []
/** 提供有真实互斥状态转换的两条原生音轨边界，保持真实控制器参与测试 */
const createTrack = () => {
  const callbacks: Record<string, () => void> = {}
  const track = {
    src: '',
    currentTime: 0,
    duration: 30,
    playbackRate: 1,
    playing: false,
    callbacks,
    play: () => {
      track.playing = true
      callbacks.play?.()
    },
    pause: () => {
      track.playing = false
      callbacks.pause?.()
    },
    stop: () => {
      track.playing = false
    },
    seek: (value: number) => {
      track.currentTime = value
    },
    destroy: vi.fn(),
    onPlay: (callback: () => void) => {
      callbacks.play = callback
    },
    onPause: (callback: () => void) => {
      callbacks.pause = callback
    },
    onEnded: (callback: () => void) => {
      callbacks.ended = callback
    },
    onError: (callback: () => void) => {
      callbacks.error = callback
    },
    onTimeUpdate: (callback: () => void) => {
      callbacks.time = callback
    }
  }
  tracks.push(track)
  return track
}
const scene = {
  card_id: 'card',
  version_id: 'v1',
  thumbnail_id: null,
  content: {
    name: 'Current scene',
    audio_id: 'full-audio',
    image_id: '',
    dialogue: [{ id: 'line', speaker: 'A', english: 'Try mobile today.', chinese: '今天试试' }],
    vocabulary: [] as { id: string }[],
    chunks: []
  },
  state: { completed: false, today_completed: false, favorite: false, started: true }
}
const meaning = {
  word: 'mobile',
  lemma: null,
  phonetic: '',
  source: 'context',
  definitions: [{ part_of_speech: '', meaning: '活动自如的' }],
  speech_text: 'mobile',
  provider: 'context'
}
beforeEach(() => {
  ports.background = false
  ports.options = undefined
  scene.content.image_id = ''
  scene.content.vocabulary = []
  ports.fullReady.mockResolvedValue(undefined)
  vi.clearAllMocks()
  tracks.length = 0
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/dictionary?')
      ? meaning
      : path.includes('/dictionary/pronunciation')
        ? { state: 'ready', url: '/api/mini/v1/dictionary-pronunciation/word' }
        : scene
  )
  vi.stubGlobal('uni', { pageScrollTo: ({ complete }: { complete?: () => void }) => complete?.() })
})
it('keeps scene background audio during hide and stops it when its page departs', async () => {
  ports.background = true
  const page = await open()
  page.findComponent({ name: 'SceneAudioPlayer' }).vm.$emit('toggle')
  await flushPromises()
  const full = tracks[0]!
  ports.hide?.()
  expect(full.playing).toBe(true)
  expect(full.destroy).not.toHaveBeenCalled()
  ports.show?.()
  await flushPromises()
  expect(tracks).toHaveLength(2)
  ports.options!.leave()
  expect(full.playing).toBe(false)
  page.unmount()
})

it('does not start scene playback if its page hides while click authorization is pending', async () => {
  ports.background = true
  const access = {
    can_learn: true,
    can_lookup: true,
    is_free: false,
    reason: null,
    version: 'active',
    server_now: '2026-11-05T00:00:00Z',
    expires_at: null
  }
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/access')
      ? { summary: { id: 'card', version_id: 'v1', state: scene.state }, access }
      : { ...scene, access }
  )
  const page = await open()
  let finish!: (value: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  page.findComponent({ name: 'SceneAudioPlayer' }).vm.$emit('toggle')
  await flushPromises()
  ports.hide?.()
  finish({ summary: { id: 'card', version_id: 'v1', state: scene.state }, access })
  await flushPromises()
  expect(tracks[0]!.playing).toBe(false)
  page.unmount()
})
/** 进入真实详情并保留真实对话与音频控制器 */
const open = async () => {
  const page = shallowMount(SceneDetail, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /><slot name="footer" /></view>' },
        SceneDialogue: false
      }
    }
  })
  ports.load?.({ id: 'card' })
  await flushPromises()
  return page
}

it('opens a word without changing full playback, pauses only on speaker, and closes without losing translation or resuming audio', async () => {
  const page = await open()
  page.findComponent({ name: 'SceneAudioPlayer' }).vm.$emit('toggle')
  await flushPromises()
  tracks[0]!.currentTime = 8
  tracks[0]!.callbacks.time?.()
  page.findComponent({ name: 'SceneAudioPlayer' }).vm.$emit('rate', 1.5)
  await page.get('.translation-toggle').trigger('click')
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  await flushPromises()
  expect(tracks).toHaveLength(2)
  expect(tracks[0]!.playing).toBe(true)
  expect(tracks[1]!.playing).toBe(false)
  const popup = page.findComponent({ name: 'SceneDictionary' })
  expect(popup.props('result')).toEqual(meaning)
  popup.vm.$emit('play')
  await flushPromises()
  expect(tracks[0]!.playing).toBe(false)
  expect(tracks[0]!.currentTime).toBe(8)
  expect(tracks[0]!.playbackRate).toBe(1.5)
  expect(tracks[1]!.playing).toBe(true)
  popup.vm.$emit('close')
  await flushPromises()
  expect(tracks[1]!.playing).toBe(false)
  expect(tracks[0]!.playing).toBe(false)
  expect(page.find('.translation-section').exists()).toBe(true)
  page.unmount()
})

it('closes the popup and stops both restricted tracks when a lookup confirms that the current card is unavailable', async () => {
  const page = await open()
  ports.request.mockImplementation(async (path: string) => {
    if (path.includes('/dictionary?')) throw new ApiError('card_offline', '当前卡片不可用', 410)
    return { id: 'card', name: 'Current scene', available: false, state: scene.state }
  })
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  await flushPromises()
  expect(page.findComponent({ name: 'SceneDictionary' }).exists()).toBe(false)
  expect(page.findComponent({ name: 'SceneUnavailable' }).exists()).toBe(true)
  expect(tracks.every((track) => !track.playing)).toBe(true)
  expect(tracks.every((track) => vi.mocked(track.destroy).mock.calls.length === 1)).toBe(true)
  page.unmount()
})

it('free scene blocks all body lookup before network and preserves full audio and translation', async () => {
  const access = {
    can_learn: true,
    can_lookup: false,
    is_free: true,
    reason: null,
    version: '1',
    server_now: '2026-10-25T00:00:00Z',
    expires_at: null
  }
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/access')
      ? { summary: { id: 'card', state: scene.state }, access }
      : { ...scene, access }
  )
  const modal = vi.fn()
  vi.stubGlobal('uni', {
    showModal: modal,
    pageScrollTo: ({ complete }: { complete?: () => void }) => complete?.()
  })
  const page = await open()
  page.findComponent({ name: 'SceneAudioPlayer' }).vm.$emit('toggle')
  await flushPromises()
  await page.get('.translation-toggle').trigger('click')
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  await flushPromises()
  expect(modal).toHaveBeenCalledWith(expect.objectContaining({ content: '点词查询需学习授权' }))
  expect(ports.request.mock.calls.some(([path]) => path.includes('/dictionary'))).toBe(false)
  expect(tracks[0]!.playing).toBe(true)
  expect(page.find('.translation-section').exists()).toBe(true)
  page.unmount()
})

it('rechecks a cached dictionary pronunciation after revocation and preserves audio on a still-free scene', async () => {
  const access = {
    can_learn: true,
    can_lookup: true,
    is_free: true,
    reason: null,
    version: 'active',
    server_now: '2026-10-25T00:00:00Z',
    expires_at: null
  }
  let current = access
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/access')
      ? { summary: { id: 'card', version_id: 'v1', state: scene.state }, access: current }
      : path.includes('/dictionary?')
        ? meaning
        : { ...scene, access }
  )
  const page = await open()
  page.findComponent({ name: 'SceneAudioPlayer' }).vm.$emit('toggle')
  await flushPromises()
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  await flushPromises()
  page.findComponent({ name: 'SceneDictionary' }).vm.$emit('play')
  await flushPromises()
  current = { ...access, can_lookup: false, version: 'revoked' }
  page.findComponent({ name: 'SceneDictionary' }).vm.$emit('play')
  await flushPromises()
  expect(page.findComponent({ name: 'SceneDictionary' }).exists()).toBe(false)
  expect(tracks[1]!.playing).toBe(false)
  page.unmount()
})

it('masks stale authorization and does not submit new completion while permission is unknown', async () => {
  const access = {
    can_learn: true,
    can_lookup: true,
    is_free: false,
    reason: null,
    version: 'active',
    server_now: '2026-10-25T00:00:00Z',
    expires_at: null
  }
  let offline = false
  ports.request.mockImplementation(async (path: string) => {
    if (path.endsWith('/access')) {
      if (offline) throw new Error('offline')
      return { summary: { id: 'card', version_id: 'v1', state: scene.state }, access }
    }
    return { ...scene, access }
  })
  const page = await open()
  offline = true
  ports.show?.()
  await flushPromises()
  expect(page.text()).toContain('权限暂未获取')
  expect(page.find('.scene-title').exists()).toBe(false)
  expect(page.find('.safe-footer').exists()).toBe(false)
  expect(ports.run).not.toHaveBeenCalled()
  page.unmount()
})

it('refreshes today completion on foreground and flags a republished version before showing old content', async () => {
  const access = {
    can_learn: true,
    can_lookup: true,
    is_free: false,
    reason: null,
    version: 'active',
    server_now: '2026-10-25T00:00:00Z',
    expires_at: null
  }
  let state = { ...scene.state, completed: true, today_completed: true },
    version = 'v1'
  ports.request.mockImplementation(async (path: string) =>
    path.endsWith('/access')
      ? { summary: { id: 'card', version_id: version, state }, access }
      : { ...scene, state, access }
  )
  const page = await open()
  state = { ...state, today_completed: false }
  ports.show?.()
  await flushPromises()
  expect(page.get('.safe-footer button').text()).toContain('完成本次复习')
  version = 'v2'
  ports.show?.()
  await flushPromises()
  expect(page.text()).toContain('内容已更新')
  expect(page.find('.scene-title').exists()).toBe(false)
  page.unmount()
})

it('preloads every body word on page entry and reuses its ready file across popup close without autoplay', async () => {
  const page = await open()
  const requests = ports.request.mock.calls.filter(([path]) =>
    path.includes('/dictionary/pronunciation')
  )
  expect(requests).toHaveLength(3)
  expect(
    requests.map(([path]) => new URL(path, 'http://fixture').searchParams.get('word'))
  ).toEqual(['Try', 'mobile', 'today'])
  expect(tracks.every((track) => !track.playing)).toBe(true)
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  await flushPromises()
  page.findComponent({ name: 'SceneDictionary' }).vm.$emit('close')
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  await flushPromises()
  expect(
    ports.request.mock.calls.filter(([path]) => path.includes('/dictionary/pronunciation'))
  ).toHaveLength(3)
  expect(tracks.every((track) => !track.playing)).toBe(true)
  page.unmount()
})

it('releases page-owned pronunciation files on hide and unload and prepares fresh files on return', async () => {
  const page = await open()
  expect(ports.release).not.toHaveBeenCalled()
  ports.hide?.()
  expect(ports.release).toHaveBeenCalledTimes(3)
  ports.show?.()
  await flushPromises()
  expect(
    ports.request.mock.calls.filter(([path]) => path.includes('/dictionary/pronunciation'))
  ).toHaveLength(6)
  expect(tracks.every((track) => !track.playing)).toBe(true)
  ports.unload?.()
  expect(ports.release).toHaveBeenCalledTimes(6)
  page.unmount()
})

afterEach(() => vi.useRealTimers())

it('coalesces slow visible-region measurements and never schedules another measurement after hide', async () => {
  vi.useFakeTimers()
  const page = await open()
  let finish!: (value: []) => void
  const measure = vi.fn(
    () =>
      new Promise<[]>((resolve) => {
        finish = resolve
      })
  )
  page.findComponent({ name: 'SceneDialogue' }).vm.$.exposed!.measureReading = measure
  ports.scroll?.({ scrollTop: 0 })
  await vi.advanceTimersByTimeAsync(120)
  expect(measure).toHaveBeenCalledTimes(1)
  ports.scroll?.({ scrollTop: 0 })
  await vi.advanceTimersByTimeAsync(120)
  ports.scroll?.({ scrollTop: 0 })
  await vi.advanceTimersByTimeAsync(120)
  expect(measure).toHaveBeenCalledTimes(1)
  finish([])
  await vi.advanceTimersByTimeAsync(120)
  expect(measure).toHaveBeenCalledTimes(2)
  ports.scroll?.({ scrollTop: 0 })
  await vi.advanceTimersByTimeAsync(120)
  ports.hide?.()
  finish([])
  await vi.advanceTimersByTimeAsync(1000)
  expect(measure).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('defers background dictionary requests while the current full audio is preparing', async () => {
  let ready!: () => void
  ports.fullReady.mockReturnValue(
    new Promise<void>((resolve) => {
      ready = resolve
    })
  )
  const page = await open()
  expect(
    ports.request.mock.calls.filter(([path]) => path.includes('/dictionary/pronunciation'))
  ).toHaveLength(0)
  ready()
  await flushPromises()
  expect(
    ports.request.mock.calls.some(([path]) => path.includes('/dictionary/pronunciation'))
  ).toBe(true)
  page.unmount()
})

it('does not start background words after full audio finishes behind an image preview, and resumes on return', async () => {
  let ready!: () => void
  scene.content.image_id = 'image'
  scene.content.vocabulary = [{ id: 'preview-word' }]
  ports.fullReady.mockReturnValue(
    new Promise<void>((resolve) => {
      ready = resolve
    })
  )
  const page = await open()
  uni.navigateTo = vi.fn(() => {
    ports.hide?.()
    return undefined as never
  })
  await page.get('.expand-image').trigger('click')
  ready()
  await flushPromises()
  expect(ports.request.mock.calls.filter(([path]) => path.includes('/pronunciation'))).toHaveLength(
    0
  )
  ports.show?.()
  await flushPromises()
  expect(ports.request.mock.calls.some(([path]) => path.includes('/pronunciation'))).toBe(true)
  page.unmount()
})
