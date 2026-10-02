// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileDashboard from './components/profile-dashboard.vue'
const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  profile: vi.fn(),
  exposure: vi.fn(),
  storage: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => Promise<void>) => {
    dependencies.show = callback
  },
  onHide: (callback: () => void) => {
    dependencies.hide = callback
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    profile: { get: dependencies.profile },
    contact: { get: async () => null, recordPromptExposure: dependencies.exposure },
    home: { getHome: async () => ({ unread_message_count: 0 }) },
    messages: { list: async () => ({ items: [], has_more: false }) }
  })
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('uni', { getStorageSync: () => '', setStorageSync: dependencies.storage })
})
afterEach(() => vi.unstubAllGlobals())
const options = {
  global: {
    stubs: {
      PersonalPage: { template: '<div><slot /><slot name="overlay" /></div>' },
      ProfileIdentity: true,
      ProfileActionList: true,
      AppButton: true
    }
  }
}
describe('联系提示真实曝光', () => {
  it('资料请求期间离页，异步返回不得消耗唯一提示机会', async () => {
    let resolve!: (value: unknown) => void
    dependencies.profile.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const wrapper = mount(ProfileDashboard, options)
    const request = dependencies.show?.()
    dependencies.hide?.()
    resolve({ juya_id: 'one', contact_prompt_eligible: true })
    await request
    await flushPromises()
    expect(dependencies.storage).not.toHaveBeenCalled()
    expect(dependencies.exposure).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('当前可见页实际渲染提示后才写本机标记和服务端曝光', async () => {
    dependencies.profile.mockResolvedValue({ juya_id: 'one', contact_prompt_eligible: true })
    const wrapper = mount(ProfileDashboard, options)
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(dependencies.storage).toHaveBeenCalled()
    expect(dependencies.exposure).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
