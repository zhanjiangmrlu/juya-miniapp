// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPageView from '@/features/favorites/components/review-page-view.vue'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => Promise<void>) | undefined,
  get: vi.fn(),
  create: vi.fn(),
  complete: vi.fn(),
  track: vi.fn(),
  navigate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (hook: typeof dependencies.load) => {
    dependencies.load = hook
  },
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onShow: vi.fn()
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    favorites: {
      get: dependencies.get,
      createReview: dependencies.create,
      completeReview: dependencies.complete
    }
  })
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ capture: () => 1, track: dependencies.track })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  dependencies.get.mockResolvedValue({
    id: 'card',
    entry_type: 'VOCABULARY',
    english: 'coffee',
    sources: []
  })
  dependencies.create.mockResolvedValue({ id: 'session', card_count: 1 })
})
const render = () =>
  mount(ReviewPageView, {
    props: { face: 'BACK' },
    global: {
      stubs: {
        PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
        ReviewCard: true,
        AppState: true,
        AppButton: {
          props: ['label'],
          emits: ['press'],
          template: '<button @click="$emit(\'press\')">{{ label }}</button>'
        }
      }
    }
  })
describe('复习开始与完成统计', () => {
  it('首张有效词卡就绪时创建队列并记开始，完成复用该会话及幂等键', async () => {
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    expect(dependencies.create).toHaveBeenCalledOnce()
    expect(dependencies.track).toHaveBeenCalledWith(
      'review_start_success',
      { entry_type: 'VOCABULARY' },
      expect.objectContaining({ token: 1, once: expect.any(String) })
    )
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '完成复习')!
      .trigger('click')
    await flushPromises()
    expect(dependencies.create).toHaveBeenCalledOnce()
    expect(dependencies.complete).toHaveBeenCalledWith('session', expect.any(String))
    expect(dependencies.track).toHaveBeenCalledWith(
      'review_complete_success',
      { entry_type: 'VOCABULARY' },
      expect.objectContaining({ token: 1, once: expect.any(String) })
    )
    wrapper.unmount()
  })
  it('卡片无效或请求失败时不创建复习队列及成功事件', async () => {
    dependencies.get.mockRejectedValueOnce(new Error('missing'))
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'missing' })
    expect(dependencies.create).not.toHaveBeenCalled()
    expect(dependencies.track).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
