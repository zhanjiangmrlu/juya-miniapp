// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

import type { AudioPort } from '@/shared/types/audio'
const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: { id: string }) => void),
  show: undefined as undefined | (() => void),
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
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onPageScroll: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'owner' },
  operations: { pending: () => false, run: ports.run },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ profile: { id: 'owner' }, ensure: async () => true })
}))
vi.mock('@/services/full-audio-preparation', () => ({
  createFullAudioPreparation: () => ({ prefetch: vi.fn(), load: () => '/full', dispose: vi.fn() })
}))
vi.mock('@/services/word-audio-preparation', () => ({
  createWordAudioPreparation: () => ({
    prefetch: vi.fn(),
    load: () => '/word',
    dispose: vi.fn(),
    invalidate: ports.invalidate
  })
}))
vi.mock('@/services/audio-port', () => ({ createAudioPort: () => createTrack() }))

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
    dialogue: [{ id: 'line', speaker: 'A', english: 'Try mobile today.', chinese: '今天试试' }],
    vocabulary: [],
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
  vi.clearAllMocks()
  tracks.length = 0
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/dictionary?') ? meaning : scene
  )
  vi.stubGlobal('uni', { pageScrollTo: ({ complete }: { complete?: () => void }) => complete?.() })
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
