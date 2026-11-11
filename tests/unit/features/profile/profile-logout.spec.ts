// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.hoisted(() => {
  vi.stubGlobal('uni', { getStorageSync: () => undefined })
})

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }))
const hooks = vi.hoisted(() => ({ show: undefined as undefined | (() => void) }))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: { value: { unread: false, count: 0 } }, refresh: vi.fn() }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: typeof hooks.show) => (hooks.show = callback)
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    profile: { nickname: '学习者' },
    avatarURL: '',
    restore: async () => undefined,
    refreshAvatar: async () => undefined,
    refreshStatistics: async () => undefined,
    logout
  })
}))
import ProfilePage from '@/features/profile/components/profile-page-view.vue'
import { session } from '@/services/api'
import { feedbackInbox } from '@/services/feedback-service'
import { PAGE_SHARE_ENTRY_KEY } from '@/shared/constants/share'

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
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
it('loads the account without requesting learning authorization while the feature is paused', async () => {
  vi.spyOn(session, 'userId').mockReturnValue('learner')
  const request = vi.spyOn(session, 'request').mockResolvedValue({})
  const wrapper = page()
  hooks.show?.()
  await flushPromises()
  expect(wrapper.find('.authorization-section').exists()).toBe(false)
  expect(request.mock.calls.some(([path]) => path === '/api/mini/v1/learning-access')).toBe(false)
  wrapper.unmount()
})
it('skips profile loading and inbox refresh for a generic share provided by its parent page', () => {
  vi.mocked(feedbackInbox.refresh).mockClear()
  const wrapper = mount(ProfilePage, {
    global: {
      provide: { [PAGE_SHARE_ENTRY_KEY as symbol]: ref(true) },
      stubs: { AppPage: { template: '<div><slot /></div>' }, AppAvatar: true, AppState: true }
    }
  })
  hooks.show?.()
  expect(feedbackInbox.refresh).not.toHaveBeenCalled()
  wrapper.unmount()
})
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

it('keeps favorites and identity while hiding paused learning authorization and retired contact fields', () => {
  const wrapper = page()
  expect(wrapper.text()).not.toContain('联系方式')
  expect(wrapper.text()).not.toContain('未填写')
  expect(wrapper.text()).toContain('我的收藏')
  expect(wrapper.text()).toContain('编辑个人资料')
  expect(wrapper.text()).not.toContain('学习授权')
  wrapper.unmount()
})
