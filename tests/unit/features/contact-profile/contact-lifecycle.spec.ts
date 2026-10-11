// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/stores/session'
import ContactManage from '@/sub-packages/profile/contact-manage.vue'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  get: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  navigate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => Promise<void>) => {
    dependencies.show = callback
  },
  onHide: (callback: () => void) => {
    dependencies.hide = callback
  },
  onUnload: vi.fn()
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    contact: {
      get: dependencies.get,
      save: dependencies.save,
      remove: dependencies.remove
    }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ capture: () => 1, track: vi.fn() })
}))
const info = {
  wechat_id: 'private_contact',
  can_self_edit: true,
  self_edit_count: 0,
  contact_status: 'PENDING',
  change_pending: false,
  consent_version: '1'
}
const options = {
  global: {
    stubs: {
      PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
      PersonalSummary: { props: ['value'], template: '<div>{{value}}<slot /></div>' },
      PersonalRow: true,
      ContactForm: true,
      AppButton: true
    }
  }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.stubGlobal('uni', { showToast: vi.fn(), setClipboardData: vi.fn() })
  dependencies.get.mockResolvedValue(info)
})
describe('本人联系资料生命周期', () => {
  it.each(['hide', 'cleanup'] as const)('%s后迟到读取不能恢复本人明文', async (leave) => {
    let resolve!: (value: unknown) => void
    dependencies.get.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const wrapper = mount(ContactManage, options)
    const pending = dependencies.show?.()
    if (leave === 'hide') dependencies.hide?.()
    else useSessionStore().invalidateLearningData()
    resolve(info)
    await pending
    await flushPromises()
    expect(wrapper.text()).not.toContain('private_contact')
    wrapper.unmount()
  })
  it('离页后迟到撤回不跳转新页面', async () => {
    let resolve!: () => void
    dependencies.remove.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    const wrapper = mount(ContactManage, options)
    await dependencies.show?.()
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '撤回')!
      .trigger('click')
    dependencies.hide?.()
    resolve()
    await flushPromises()
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
