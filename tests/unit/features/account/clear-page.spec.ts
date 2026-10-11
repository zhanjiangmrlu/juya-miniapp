// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useFavoriteStore } from '@/stores/favorites'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'
import { useSessionStore } from '@/stores/session'
import ClearConfirm from '@/sub-packages/account/clear-confirm.vue'

import type { UserProfile } from '@/shared/contracts/profile'
const dependencies = vi.hoisted(() => ({
  clear: vi.fn(),
  navigate: vi.fn(),
  hide: undefined as (() => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: vi.fn(),
  onHide: (hook: () => void) => {
    dependencies.hide = hook
  },
  onUnload: vi.fn()
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ account: { clearLearningData: dependencies.clear } })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
afterEach(() => vi.unstubAllGlobals())
beforeEach(() => vi.resetAllMocks())
it('本人清空成功即使递增学习清理代次仍完成授权成功导航', async () => {
  setActivePinia(createPinia())
  vi.stubGlobal('uni', { removeStorageSync: vi.fn(), showToast: vi.fn() })
  dependencies.clear.mockResolvedValueOnce(undefined)
  const wrapper = mount(ClearConfirm, {
    global: { stubs: { PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' } } }
  })
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '确认清空')!
    .trigger('click')
  await flushPromises()
  expect(useSessionStore().cleanupGeneration).toBe(1)
  expect(dependencies.navigate).toHaveBeenCalledExactlyOnceWith({
    type: 'reLaunch',
    url: '/pages/profile/index'
  })
  wrapper.unmount()
})
it.each(['account', 'hide'])('%s改变后迟到清空成功不清当前收藏或跳转', async (change) => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.stubGlobal('uni', { removeStorageSync: vi.fn(), showToast: vi.fn() })
  let finish!: () => void
  dependencies.clear.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        finish = done
      })
  )
  const wrapper = mount(ClearConfirm, {
    global: { stubs: { PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' } } }
  })
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '确认清空')!
    .trigger('click')
  if (change === 'account') useSessionStore().profile = { juya_id: 'new-account' } as UserProfile
  else dependencies.hide?.()
  useFavoriteStore().items = [
    {
      id: 'new-favorite',
      entry_stable_id: 'one',
      entry_type: 'VOCABULARY',
      normalized_key: 'new',
      favorited_at: '',
      last_reviewed_at: null,
      sources: []
    }
  ]
  finish()
  await flushPromises()
  expect(useFavoriteStore().items.map((item) => item.id)).toEqual(['new-favorite'])
  expect(dependencies.navigate).not.toHaveBeenCalled()
  expect(uni.showToast).not.toHaveBeenCalled()
  wrapper.unmount()
})
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
