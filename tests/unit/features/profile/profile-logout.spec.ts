// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubGlobal('uni', { getStorageSync: () => undefined })
})

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: { value: { unread: false, count: 0 } }, refresh: vi.fn() }
}))
vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn() }))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    profile: { nickname: '学习者', phone: null, wechat_contact: null },
    avatarURL: '',
    logout
  })
}))
import ProfilePage from '@/sub-packages/account/profile.vue'

/** 挂载资料页真实退出确认流程，平台导航由测试隔离 */
const page = () =>
  mount(ProfilePage, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot /></div>' },
        AppAvatar: true,
        AppState: true,
        AppPrivacySheet: true
      }
    }
  })
beforeEach(() => {
  vi.stubGlobal('uni', { showModal: vi.fn() })
  logout.mockReset().mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllGlobals())
it('requires confirmation and lets cancel leave the current account intact', async () => {
  const wrapper = page()
  await wrapper.get('.profile-bottom button').trigger('click')
  expect(wrapper.find('.logout-dialog').exists()).toBe(true)
  expect(logout).not.toHaveBeenCalled()
  await wrapper.get('.logout-dialog .cancel').trigger('click')
  expect(wrapper.find('.logout-dialog').exists()).toBe(false)
  expect(logout).not.toHaveBeenCalled()
  wrapper.unmount()
})
it('prevents duplicate logout submissions and shows a recoverable failure', async () => {
  let reject: (reason: Error) => void = () => undefined
  logout.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail
      })
  )
  const wrapper = page()
  await wrapper.get('.profile-bottom button').trigger('click')
  await wrapper.get('.logout-dialog .confirm').trigger('click')
  await wrapper.get('.logout-dialog .confirm').trigger('click')
  expect(logout).toHaveBeenCalledOnce()
  reject(new Error('退出暂未成功，请重试'))
  await flushPromises()
  expect(wrapper.find('.logout-dialog').exists()).toBe(true)
  expect(wrapper.text()).toContain('退出暂未成功，请重试')
  wrapper.unmount()
})
it('opens a fresh confirmation after cancellation and lets retry succeed', async () => {
  logout.mockRejectedValueOnce(new Error('退出暂未成功，请重试'))
  const wrapper = page()
  await wrapper.get('.profile-bottom button').trigger('click')
  await wrapper.get('.logout-dialog .confirm').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('退出暂未成功，请重试')
  await wrapper.get('.logout-dialog .cancel').trigger('click')
  await wrapper.get('.profile-bottom button').trigger('click')
  expect(wrapper.find('.dialog-error').exists()).toBe(false)
  await wrapper.get('.logout-dialog .confirm').trigger('click')
  await flushPromises()
  expect(logout).toHaveBeenCalledTimes(2)
  expect(wrapper.find('.logout-dialog').exists()).toBe(false)
  wrapper.unmount()
})
