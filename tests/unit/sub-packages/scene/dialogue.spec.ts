// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adaptSceneResponse } from '@/services/scene-response'
import { useAudioStore } from '@/stores/audio'
import Dialogue from '@/sub-packages/scene/dialogue.vue'

import type { SceneOpenWireResponse } from '@/shared/contracts/learning'

const runtime = vi.hoisted(() => ({
  scene: {
    open: vi.fn(),
    getSignedUrl: vi.fn(),
    savePosition: vi.fn(),
    complete: vi.fn()
  }
}))
const hooks = vi.hoisted(() => ({
  load: undefined as ((query?: Record<string, string>) => Promise<void>) | undefined
}))
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => runtime }))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof hooks.load) => {
    hooks.load = callback
  },
  onShow: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onPageScroll: vi.fn()
}))

/** 构造同一整段音频的三句时间数据，confirmed 为管理端是否确认逐句时间 */
const openedScene = (confirmed: boolean): SceneOpenWireResponse => ({
  access: 'OPEN',
  activated_at: null,
  authorization_pending: false,
  earliest_expires_at: null,
  sources: ['OPEN'],
  scene: {
    scene_id: 'work',
    revision_id: 'revision',
    content_version: 1,
    content: {
      title_en: 'A Better Way to Work',
      title_zh: '更好的协作方式',
      summary: '',
      tags: [],
      original_image_asset_id: null,
      cover_asset_id: null,
      audio: { target_id: 'audio', version_id: 'v1', asset_id: 'asset', duration_ms: 12000 },
      dialogue: [
        { id: 's1', start_ms: 300, end_ms: 3000 },
        { id: 's2', start_ms: 4000, end_ms: 7000 },
        { id: 's3', start_ms: 8000, end_ms: 11000 }
      ].map((sentence) => ({
        ...sentence,
        speaker: 'A',
        english: sentence.id,
        chinese: '',
        audio_version_id: 'v1',
        timing_confirmed: confirmed,
        clickable_spans: []
      })),
      vocabulary: [],
      chunks: []
    }
  }
})

/** 提供可推进播放位置的设备，暂停事件携带真实设备位置 */
const createDevice = () => {
  let onPlay = () => undefined as void
  let onPause = () => undefined as void
  let onTimeUpdate = () => undefined as void
  let onCanplay = () => undefined as void
  const device = {
    currentTime: 0,
    autoplay: false,
    set src(_url: string) {
      onCanplay()
    },
    onPlay: (callback: () => void) => (onPlay = callback),
    onPause: (callback: () => void) => (onPause = callback),
    onTimeUpdate: (callback: () => void) => (onTimeUpdate = callback),
    onCanplay: (callback: () => void) => (onCanplay = callback),
    onEnded: vi.fn(),
    onError: vi.fn(),
    seek: (seconds: number) => (device.currentTime = seconds),
    play: () => onPlay(),
    pause: () => onPause(),
    stop: vi.fn(),
    destroy: vi.fn()
  }
  return { device, tick: () => onTimeUpdate() }
}

let wrapper: ReturnType<typeof mount>
let playback: ReturnType<typeof createDevice>

/** 挂载真实场景播放链路，confirmed 为测试场景的句子时间确认状态 */
const openPage = async (confirmed = true) => {
  runtime.scene.open.mockResolvedValue(adaptSceneResponse(openedScene(confirmed)))
  wrapper = mount(Dialogue, {
    global: {
      stubs: {
        ScenePageLayout: { template: '<div><slot /></div>' },
        'scroll-view': { template: '<div><slot /></div>' },
        'page-meta': true
      }
    }
  })
  await hooks.load?.({ sceneId: 'work' })
  await wrapper.find('.whole-player button').trigger('click')
  await flushPromises()
}

/** 读取页面实际高亮句卡，避免只验证播放器内部状态 */
const highlightedRows = () =>
  wrapper.findAll('.dialogue-sentence.highlighted').map((row) => row.attributes('id'))

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  playback = createDevice()
  const storage = new Map<string, unknown>()
  vi.stubGlobal('uni', {
    createInnerAudioContext: () => playback.device,
    getStorageSync: (key: string) => storage.get(key),
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key)
  })
  runtime.scene.getSignedUrl.mockResolvedValue({ url: '/audio.wav' })
  runtime.scene.savePosition.mockResolvedValue({})
})
afterEach(() => {
  useAudioStore().dispose()
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('场景整段播放的句子激活展示', () => {
  it('第二句暂停后保留高亮，继续进入第三句时切换高亮', async () => {
    await openPage()
    playback.device.currentTime = 5
    playback.tick()
    await flushPromises()
    expect(highlightedRows()).toEqual(['s2'])
    await wrapper.find('.whole-player button').trigger('click')
    expect(highlightedRows()).toEqual(['s2'])
    await wrapper.find('.whole-player button').trigger('click')
    playback.device.currentTime = 8
    playback.tick()
    await flushPromises()
    expect(highlightedRows()).toEqual(['s3'])
  })

  it('暂停时读取设备最新位置，即使进度事件尚未通知也激活当前句', async () => {
    await openPage()
    playback.device.currentTime = 4.1
    await wrapper.find('.whole-player button').trigger('click')
    expect(highlightedRows()).toEqual(['s2'])
  })

  it('句间停顿保留上一句，达到下一句起点才切换', async () => {
    await openPage()
    for (const [seconds, expected] of [
      [3.5, 's1'],
      [4, 's2'],
      [7.5, 's2'],
      [8, 's3']
    ] as const) {
      playback.device.currentTime = seconds
      playback.tick()
      await flushPromises()
      expect(highlightedRows()).toEqual([expected])
    }
  })

  it('未确认候选时间只驱动阅读高亮，不开放逐句播放', async () => {
    await openPage(false)
    playback.device.currentTime = 5
    playback.tick()
    await flushPromises()
    expect(highlightedRows()).toEqual(['s2'])
    expect(wrapper.findAll('.dialogue-sentence button')).toHaveLength(0)
    await wrapper.find('.whole-player button').trigger('click')
    expect(highlightedRows()).toEqual(['s2'])
  })
})
