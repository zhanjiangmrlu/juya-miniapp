// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/stores/session'
import AccountPage from '@/sub-packages/account/index.vue'

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
