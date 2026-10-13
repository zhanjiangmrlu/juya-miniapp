// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FavoriteBankPage from '@/features/favorites/components/favorite-bank-page.vue'
import ReviewPageView from '@/features/favorites/components/review-page-view.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { useAudioStore } from '@/stores/audio'
import FavoriteDetail from '@/sub-packages/favorites/detail.vue'

import type { AudioEvent } from '@/shared/types/audio'

const deps = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => unknown) | undefined,
  show: [] as (() => unknown)[],
  hide: [] as (() => unknown)[],
  unload: [] as (() => unknown)[],
  post: vi.fn(),
  source: vi.fn(),
  stop: vi.fn(),
  play: vi.fn(),
  savePosition: vi.fn(),
  listener: undefined as ((event: AudioEvent) => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof deps.load) => {
    deps.load = callback
  },
  onShow: (callback: () => unknown) => deps.show.push(callback),
  onHide: (callback: () => unknown) => deps.hide.push(callback),
  onUnload: (callback: () => unknown) => deps.unload.push(callback),
  onPageScroll: vi.fn()
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ track: vi.fn(), capture: () => 1 })
}))
const item = {
  id: 'card',
  active: true,
  entry_stable_id: 'entry',
  entry_type: 'VOCABULARY',
  normalized_key: 'coffee',
  english: 'coffee',
  favorited_at: '',
  last_reviewed_at: null,
  sources: [],
  pronunciation: { target_id: 'word', can_prepare: true }
}
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    client: { post: deps.post },
    scene: {
      open: async () => ({
        access: 'OPEN',
        authorization_pending: false,
        scene: {
          scene_id: 'coffee',
          revision_id: 'r1',
          content_version: 1,
          chinese_title: '咖啡店',
          title: 'Coffee',
          series: '日常',
          entries: [],
          audio: { target_id: 'scene', version_id: 'v1', target_type: 'scene' }
        }
      }),
      savePosition: deps.savePosition,
      getSignedUrl: async () => ({ url: 'scene-signed', expires_at: '', target_id: 'scene' })
    },
    favorites: {
      get: async () => item,
      list: async () => ({ items: [item], has_more: false, next_cursor: null }),
      createReview: async () => ({ id: 'review', card_count: 1 })
    }
  })
}))
vi.mock('@/features/audio/uni-audio-engine', () => ({
  createUniAudioEngine: () => ({
    setSource: deps.source,
    play: deps.play,
    stop: deps.stop,
    destroy: vi.fn(),
    seek: vi.fn(),
    pause: vi.fn(),
    subscribe: (listener: (event: AudioEvent) => void) => {
      deps.listener = listener
      return () => {
        deps.listener = undefined
      }
    }
  })
}))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  deps.show = []
  deps.hide = []
  deps.unload = []
  deps.listener = undefined
  vi.stubGlobal('uni', {
    getStorageSync: vi.fn(),
    pageScrollTo: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    showToast: vi.fn()
  })
})
describe.each([
  { name: '银行', component: FavoriteBankPage, props: {} },
  { name: '详情', component: FavoriteDetail, props: {} },
  { name: '翻卡', component: ReviewPageView, props: { face: 'FRONT' } }
])('$name发音生命周期', ({ component, props }) => {
  it.each(['hide', 'unload'] as const)('%s取消尚未READY的发音', async (leave) => {
    let finish!: (value: unknown) => void
    deps.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(component as typeof FavoriteBankPage, {
      props,
      global: {
        stubs: {
          'scroll-view': { template: '<div><slot /></div>' },
          PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' }
        }
      }
    })
    await deps.load?.({ id: 'card', cardIds: 'card' })
    for (const show of deps.show) await show()
    await wrapper.get('.pronunciation-button').trigger('click')
    deps[leave].forEach((callback) => callback())
    finish({ status: 'READY', url: 'old-signed', resource_version: 'v1' })
    await flushPromises()
    deps.listener?.({ type: 'canplay' })
    deps.listener?.({ type: 'play' })
    expect(deps.source).not.toHaveBeenCalled()
    expect(deps.play).not.toHaveBeenCalled()
    expect(useAudioStore().snapshot.target).toBeNull()
    wrapper.unmount()
  })
  it('旧页面卸载不会停止新页面发音', async () => {
    deps.post.mockResolvedValue({ status: 'READY', url: 'old', resource_version: 'v1' })
    const wrapper = mount(component as typeof FavoriteBankPage, {
      props,
      global: {
        stubs: {
          'scroll-view': { template: '<div><slot /></div>' },
          PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' }
        }
      }
    })
    await deps.load?.({ id: 'card', cardIds: 'card' })
    for (const show of deps.show) await show()
    await wrapper.get('.pronunciation-button').trigger('click')
    await flushPromises()
    const audio = useAudioStore()
    await audio.play(
      { target_id: 'new-page', version_id: 'v2', target_type: 'scene' },
      { getSignedUrl: async () => ({ url: 'new', expires_at: '', target_id: 'new-page' }) }
    )
    deps.stop.mockClear()
    deps.unload.forEach((callback) => callback())
    wrapper.unmount()
    expect(audio.snapshot.target?.target_id).toBe('new-page')
    expect(deps.stop).not.toHaveBeenCalled()
    audio.dispose()
  })
})

it('已播放场景收到进度403后立即停止播放和清空正文', async () => {
  deps.savePosition.mockRejectedValue({ status: 403, code: 'SCENE_ACCESS_DENIED' })
  const page = useScenePage()
  await page.initialize('coffee')
  await page.play(page.fullModel.value!.audio!)
  deps.listener?.({ type: 'canplay' })
  deps.listener?.({ type: 'play' })
  expect(useAudioStore().snapshot.status).toBe('PLAYING')
  page.savePosition({ entry_id: 's1', offset: 1 })
  await vi.waitFor(() => expect(page.fullModel.value).toBeUndefined(), { timeout: 1500 })
  expect(useAudioStore().snapshot.target).toBeNull()
  expect(deps.stop).toHaveBeenCalled()
  page.disposeAudio()
})
it('隐藏场景的进度迟到拒绝不能停止新页面音频', async () => {
  let reject!: (value: unknown) => void
  deps.savePosition.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      })
  )
  const page = useScenePage()
  await page.initialize('coffee')
  page.savePosition({ entry_id: 's1', offset: 1 })
  page.disposeAudio()
  const audio = useAudioStore()
  await audio.play(
    { target_id: 'new-page', version_id: 'v2', target_type: 'scene' },
    { getSignedUrl: async () => ({ url: 'new', expires_at: '', target_id: 'new-page' }) }
  )
  reject({ status: 403 })
  await flushPromises()
  expect(audio.snapshot.target?.target_id).toBe('new-page')
  page.disposeAudio()
  expect(audio.snapshot.target?.target_id).toBe('new-page')
  audio.dispose()
})
