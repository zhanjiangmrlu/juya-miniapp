// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

import type { AudioPort } from '@/shared/types/audio'
const ports = vi.hoisted(() => ({
  load: undefined as undefined | ((query: { id: string }) => void),
  request: vi.fn(),
  invalidate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onPageScroll: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'owner' },
  operations: { pending: () => false },
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
