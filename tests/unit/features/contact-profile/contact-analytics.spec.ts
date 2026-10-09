// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ContactEdit from '@/sub-packages/profile/contact-edit.vue'
import ContactManage from '@/sub-packages/profile/contact-manage.vue'

const dependencies = vi.hoisted(() => ({
  hide: undefined as (() => void) | undefined,
  show: undefined as (() => Promise<void>) | undefined,
  save: vi.fn(),
  track: vi.fn(),
  navigate: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onHide: (listener: () => void) => {
    dependencies.hide = listener
  },
  onUnload: vi.fn(),
  onShow: (listener: () => Promise<void>) => {
    dependencies.show = listener
  }
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ capture: () => 1, track: dependencies.track })
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    contact: {
      save: dependencies.save,
      get: async () => ({
        can_self_edit: true,
        self_edit_count: 0,
        contact_status: 'PENDING',
        wechat_id: 'private-id'
      })
    }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
const options = {
  global: {
    stubs: {
      PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
      PersonalSummary: true,
      ContactForm: { name: 'ContactForm', emits: ['submit'], template: '<div />' },
      AppButton: true,
      PersonalRow: true
    }
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('uni', { showToast: vi.fn() })
  dependencies.save.mockResolvedValue({
    can_self_edit: false,
    wechat_id: 'private-id',
    contact_status: 'PENDING'
  })
})
afterEach(() => vi.unstubAllGlobals())
describe('联系资料成功事件与敏感字段', () => {
  it.each([
    [ContactEdit, 'contact_fill'],
    [ContactManage, 'contact_update']
  ] as const)('保存%s区分入口且不上传微信号', async (component, source) => {
    const wrapper = mount(component, options)
    if (component === ContactManage) await dependencies.show?.()
    wrapper.findComponent({ name: 'ContactForm' }).vm.$emit('submit', 'private-id')
    await flushPromises()
    expect(dependencies.track).toHaveBeenCalledWith(
      'contact_save_success',
      { entry_source: source },
      { token: 1 }
    )
    expect(JSON.stringify(dependencies.track.mock.calls)).not.toContain('private-id')
    wrapper.unmount()
  })
  it('隐藏页面后迟到成功及保存失败均不计成功', async () => {
    let done!: () => void
    dependencies.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve
        })
    )
    const wrapper = mount(ContactEdit, options)
    wrapper.findComponent({ name: 'ContactForm' }).vm.$emit('submit', 'private-id')
    dependencies.hide?.()
    done()
    await flushPromises()
    expect(dependencies.track).not.toHaveBeenCalled()
    dependencies.save.mockRejectedValueOnce(new Error('offline'))
    wrapper.findComponent({ name: 'ContactForm' }).vm.$emit('submit', 'private-id')
    await flushPromises()
    expect(dependencies.track).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
