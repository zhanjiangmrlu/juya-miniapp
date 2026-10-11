// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAccountDeletionStore } from '@/stores/account-deletion'
import { useSessionStore } from '@/stores/session'
import DeletionPending from '@/sub-packages/account/deletion-pending.vue'

import type { UserProfile } from '@/shared/contracts/profile'
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  unload: undefined as (() => void) | undefined,
  profile: vi.fn(),
  revoke: vi.fn(),
  navigate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: typeof dependencies.show) => {
    dependencies.show = callback
  },
  onHide: (callback: typeof dependencies.hide) => {
    dependencies.hide = callback
  },
  onUnload: (callback: typeof dependencies.unload) => {
    dependencies.unload = callback
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    profile: { get: dependencies.profile },
    account: { revokeDeletion: dependencies.revoke },
    entitlements: { get: async () => ({ server_now: '2026-10-02T00:00:00Z' }) },
    favorites: { list: async () => ({ items: [], next_cursor: null, has_more: false }) },
    home: { getHome: async () => ({ checkins: { total_days: 0 }, unread_message_count: 0 }) },
    catalog: {
      getModules: async () => ({ items: [] }),
      getCatalog: async () => ({ items: [], authorization_pending: false })
    }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
const pending = {
  juya_id: 'one',
  deletion: { status: 'PENDING', effective_at: '2026-10-08T00:00:00Z' }
} as UserProfile
const options = {
  global: { stubs: { PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' } } }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.useFakeTimers()
  const storage = new Map<string, unknown>()
  vi.stubGlobal('uni', {
    getStorageSync: (key: string) => storage.get(key),
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key)
  })
  useSessionStore().accessToken = 'test-session'
  useSessionStore().profile = { juya_id: 'one' } as UserProfile
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('注销等待页请求生命周期', () => {
  it('本人档案与已确认会话身份不一致时不保存或展示注销投影', async () => {
    dependencies.profile.mockResolvedValue({ ...pending, juya_id: 'other-account' })
    const wrapper = mount(DeletionPending, options)
    await dependencies.show?.()
    expect(useAccountDeletionStore().request).toBeUndefined()
    expect(wrapper.text()).not.toContain('注销期还剩')
    wrapper.unmount()
  })
  it('旧账号撤回受理迟到不清新账号投影或导航', async () => {
    dependencies.profile.mockResolvedValue(pending)
    const wrapper = mount(DeletionPending, options)
    await dependencies.show?.()
    let finish!: (value: unknown) => void
    dependencies.revoke.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '撤回注销')!
      .trigger('click')
    useSessionStore().profile = { juya_id: 'new-account' } as UserProfile
    useAccountDeletionStore().save({
      status: 'PENDING',
      id: 'new-delete',
      effective_at: '2099-01-01',
      requested_at: '',
      completed_at: null,
      revoked_at: null
    })
    finish({ status: 'REVOKED' })
    await flushPromises()
    expect(useAccountDeletionStore().request?.id).toBe('new-delete')
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('撤回成功后，先前刷新响应不得恢复待注销缓存', async () => {
    const wrapper = mount(DeletionPending, options)
    dependencies.profile.mockResolvedValue(pending)
    await dependencies.show?.()
    let finish!: (profile: UserProfile) => void
    dependencies.profile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const oldRefresh = dependencies.show?.()
    dependencies.profile.mockResolvedValue({ juya_id: 'one', deletion: null })
    dependencies.revoke.mockResolvedValue({ status: 'REVOKED' })
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '撤回注销')!
      .trigger('click')
    await flushPromises()
    expect(useAccountDeletionStore().request).toBeUndefined()
    finish(pending)
    await oldRefresh
    expect(useAccountDeletionStore().request).toBeUndefined()
    dependencies.hide?.()
    wrapper.unmount()
  })
  it.each(['hide', 'unload'] as const)(
    '%s后迟到资料不能写入缓存或重新启动倒计时',
    async (leave) => {
      let finish!: (profile: UserProfile) => void
      dependencies.profile.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      const wrapper = mount(DeletionPending, options)
      const request = dependencies.show?.()
      dependencies[leave]?.()
      finish(pending)
      await request
      expect(useAccountDeletionStore().request).toBeUndefined()
      expect(vi.getTimerCount()).toBe(0)
      dependencies.hide?.()
      wrapper.unmount()
    }
  )
})
