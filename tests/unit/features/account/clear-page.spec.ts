// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, expect, it, vi } from 'vitest'

import { useFavoriteStore } from '@/stores/favorites'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'
import ClearConfirm from '@/sub-packages/account/clear-confirm.vue'

const dependencies = vi.hoisted(() => ({ clear: vi.fn(), navigate: vi.fn() }))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ account: { clearLearningData: dependencies.clear } })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
afterEach(() => vi.unstubAllGlobals())
it('服务端清空请求在途或失败时保留收藏、反馈草稿和待同步缓存', async () => {
  setActivePinia(createPinia())
  const storage = new Map([['juya.progress-queue', 'pending-command']])
  vi.stubGlobal('uni', { removeStorageSync: (key: string) => storage.delete(key) })
  const favorites = useFavoriteStore()
  favorites.items = [
    {
      id: 'one',
      entry_stable_id: 'one',
      entry_type: 'VOCABULARY',
      normalized_key: 'latte',
      favorited_at: '',
      last_reviewed_at: null,
      sources: []
    }
  ]
  useFeedbackDraftStore().update({ description: '未提交说明' })
  let fail!: (error: Error) => void
  dependencies.clear.mockImplementation(
    () =>
      new Promise((_, reject) => {
        fail = reject
      })
  )
  const wrapper = mount(ClearConfirm, {
    global: { stubs: { PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' } } }
  })
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '确认清空')!
    .trigger('click')
  expect(favorites.items.map((item) => item.id)).toEqual(['one'])
  fail(new Error('offline'))
  await flushPromises()
  expect(wrapper.text()).toContain('暂时无法清空')
  expect(favorites.items.map((item) => item.id)).toEqual(['one'])
  expect(useFeedbackDraftStore().draft.description).toBe('未提交说明')
  expect(storage.get('juya.progress-queue')).toBe('pending-command')
  expect(dependencies.navigate).not.toHaveBeenCalled()
  wrapper.unmount()
})
