// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import Completed from '@/sub-packages/scene/completed.vue'

const deps = vi.hoisted(() => ({
  load: undefined as ((query?: Record<string, string>) => Promise<void>) | undefined,
  hide: [] as (() => void)[],
  get: vi.fn(),
  navigate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof deps.load) => {
    deps.load = callback
  },
  onHide: (callback: () => void) => deps.hide.push(callback),
  onUnload: vi.fn(),
  onShow: vi.fn()
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/features/scene/use-scene-page', () => ({
  useScenePage: () => ({
    initialize: vi.fn(),
    disposeAudio: vi.fn(),
    fullModel: ref({ chineseTitle: '咖啡店' }),
    sceneId: ref('coffee')
  })
}))
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => ({ result: { get: deps.get } }) }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: deps.navigate }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => ({ cleanupGeneration: 0 }) }))
beforeEach(() => {
  vi.clearAllMocks()
  deps.hide = []
})
it('成果查询失败显示同位重试，重试成功后才显示权威统计', async () => {
  deps.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
    streak_days: 9,
    completed_scenes: 3,
    favorite_vocabulary: 4,
    favorite_phrases: 5
  })
  const wrapper = mount(Completed, {
    global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
  })
  await deps.load?.({ sceneId: 'coffee' })
  expect(wrapper.text()).toContain('成果加载失败')
  expect(wrapper.text()).not.toContain('本次学习已记录')
  expect(wrapper.find('.streak-value').exists()).toBe(false)
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('重试'))!
    .trigger('click')
  await flushPromises()
  expect(wrapper.get('.streak-value').text()).toContain('9')
  expect(wrapper.text()).toContain('本次学习已记录')
  wrapper.unmount()
})
it('成果响应迟到离页后不恢复成功统计', async () => {
  let finish!: (value: unknown) => void
  deps.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const wrapper = mount(Completed, {
    global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
  })
  const loading = deps.load?.({ sceneId: 'coffee' })
  await flushPromises()
  deps.hide.forEach((callback) => callback())
  finish({ streak_days: 9, completed_scenes: 3, favorite_vocabulary: 4, favorite_phrases: 5 })
  await loading
  expect(wrapper.find('.streak-value').exists()).toBe(false)
  wrapper.unmount()
})
