// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/stores/session'
import AccountPage from '@/sub-packages/account/index.vue'

import type { UserProfile } from '@/shared/contracts/profile'

const dependencies = vi.hoisted(() => ({
  profile: vi.fn(),
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
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ profile: { get: dependencies.profile } })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
const options = {
  global: {
    stubs: {
      PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
      AnalyticsSettings: true
    }
  }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})
describe('数据账号页请求归属', () => {
  it('冷启动本人档案初次确认后重新读取并展示操作入口', async () => {
    let finish!: (value: unknown) => void
    dependencies.profile.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    dependencies.profile.mockResolvedValue({ juya_id: 'one', deletion: null })
    const session = useSessionStore()
    session.accessToken = 'test-session'
    const wrapper = mount(AccountPage, options)
    const first = dependencies.show?.()
    session.profile = { juya_id: 'one' } as UserProfile
    finish({ juya_id: 'old', deletion: { status: 'PENDING', effective_at: '2099-01-01' } })
    await first
    await flushPromises()
    expect(wrapper.text()).toContain('清空学习数据')
    expect(dependencies.profile).toHaveBeenCalledTimes(2)
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('离页后旧注销状态不得触发重新定向', async () => {
    let finish!: (value: unknown) => void
    dependencies.profile.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(AccountPage, options)
    const pending = dependencies.show?.()
    dependencies.hide?.()
    finish({ deletion: { status: 'PENDING', effective_at: '2099-01-01' } })
    await pending
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('隐藏页初次确认身份不发起读取，重新显示本人待注销状态正常定向', async () => {
    const session = useSessionStore()
    session.accessToken = 'test-session'
    const wrapper = mount(AccountPage, options)
    dependencies.hide?.()
    session.profile = { juya_id: 'one' } as UserProfile
    await flushPromises()
    expect(dependencies.profile).not.toHaveBeenCalled()
    dependencies.profile.mockResolvedValue({
      juya_id: 'one',
      deletion: { status: 'PENDING', effective_at: '2099-01-01' }
    })
    await dependencies.show?.()
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/account/deletion-pending'
    })
    wrapper.unmount()
  })
  it('保留身份清理代次改变后撤销当前危险操作入口', async () => {
    dependencies.profile.mockResolvedValue({ deletion: null })
    const wrapper = mount(AccountPage, options)
    await dependencies.show?.()
    expect(wrapper.text()).toContain('清空学习数据')
    useSessionStore().invalidateLearningData()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('清空学习数据')
    wrapper.unmount()
  })
})
