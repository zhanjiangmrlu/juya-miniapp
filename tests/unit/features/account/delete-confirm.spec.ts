// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAccountDeletionStore } from '@/stores/account-deletion'
import { useSessionStore } from '@/stores/session'
import DeleteConfirm from '@/sub-packages/account/delete-confirm.vue'

import type { UserProfile } from '@/shared/contracts/profile'
const dependencies = vi.hoisted(() => ({
  metrics: vi.fn(),
  request: vi.fn(),
  navigate: vi.fn(),
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (hook: () => Promise<void>) => {
    dependencies.show = hook
  },
  onHide: (hook: () => void) => {
    dependencies.hide = hook
  },
  onUnload: vi.fn()
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/features/account/account-metrics', () => ({ loadAccountMetrics: dependencies.metrics }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    account: { requestDeletion: dependencies.request },
    entitlements: { get: async () => ({ formal: [], limited: [] }) },
    catalog: { getCatalog: async () => ({ items: [] }) }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
const options = {
  global: { stubs: { PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' } } }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.stubGlobal('uni', { setStorageSync: vi.fn(), removeStorageSync: vi.fn() })
  useSessionStore().accessToken = 'test-session'
  useSessionStore().profile = { juya_id: 'one' } as UserProfile
  dependencies.metrics.mockResolvedValue({
    totalDays: 5,
    currentStreak: 2,
    favoriteCount: 3,
    completedScenes: 1
  })
})
describe('注销确认请求归属', () => {
  it('可见页身份确认后重新读取，学习清理后用户可重试恢复确认', async () => {
    const session = useSessionStore()
    session.profile = undefined
    const wrapper = mount(DeleteConfirm, options)
    await dependencies.show?.()
    session.profile = { juya_id: 'one' } as UserProfile
    await flushPromises()
    session.invalidateLearningData()
    await wrapper.vm.$nextTick()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '重新读取学习数据')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('5 天')
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === '继续注销')!
        .attributes('disabled')
    ).toBeUndefined()
    wrapper.unmount()
  })
  it('本人受理成功清理学习草稿，保留绑定的注销申请并进入七天等待页', async () => {
    dependencies.request.mockResolvedValueOnce({
      status: 'PENDING',
      id: 'own-delete',
      requested_at: '2026-10-11',
      effective_at: '2026-10-18',
      revoked_at: null,
      completed_at: null
    })
    const wrapper = mount(DeleteConfirm, options)
    await dependencies.show?.()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '继续注销')!
      .trigger('click')
    await flushPromises()
    expect(useSessionStore().cleanupGeneration).toBe(1)
    expect(useAccountDeletionStore().request?.id).toBe('own-delete')
    expect(dependencies.navigate).toHaveBeenCalledExactlyOnceWith({
      type: 'redirectTo',
      url: '/sub-packages/account/deletion-pending'
    })
    wrapper.unmount()
  })
  it('迟到成果不能填入隐藏的确认页或允许注销', async () => {
    let finish!: (value: unknown) => void
    dependencies.metrics.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(DeleteConfirm, options)
    const pending = dependencies.show?.()
    dependencies.hide?.()
    finish({ totalDays: 88, currentStreak: 88, favoriteCount: 88, completedScenes: 88 })
    await pending
    expect(wrapper.text()).not.toContain('88')
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === '继续注销')!
        .attributes('disabled')
    ).toBeDefined()
    wrapper.unmount()
  })
  it('注销受理迟到不能写入新账号注销投影、清理或导航', async () => {
    let finish!: (value: unknown) => void
    dependencies.request.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(DeleteConfirm, options)
    await dependencies.show?.()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '继续注销')!
      .trigger('click')
    useSessionStore().profile = { juya_id: 'new-account' } as UserProfile
    finish({
      status: 'PENDING',
      id: 'old-delete',
      requested_at: '',
      effective_at: '2099-01-01',
      revoked_at: null,
      completed_at: null
    })
    await flushPromises()
    expect(useAccountDeletionStore().request).toBeUndefined()
    expect(uni.removeStorageSync).not.toHaveBeenCalledWith('juya.progress-queue')
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
