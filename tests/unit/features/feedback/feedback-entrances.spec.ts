// @vitest-environment happy-dom
import { shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'
const ports = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onPageScroll: vi.fn(),
  onHide: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onShow: vi.fn(),
  onUnload: vi.fn(),
  onReachBottom: vi.fn(),
  onPullDownRefresh: vi.fn()
}))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: ref({ unread: true, count: 1 }), refresh: vi.fn() }
}))
vi.mock('@/services/api', () => ({
  session: { request: vi.fn(), userId: () => 'owner' },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ profile: { id: 'owner', nickname: '学习者' } })
}))
import Learning from '@/pages/learning/index.vue'
import Profile from '@/sub-packages/account/profile.vue'
beforeEach(() =>
  vi.stubGlobal('uni', { navigateTo: ports.navigate, getWindowInfo: () => ({ windowWidth: 390 }) })
)
it('provides the profile feedback row and aggregate unread dot without a third bottom tab', async () => {
  const wrapper = shallowMount(Profile, {
    global: { stubs: { AppPage: { template: '<div><slot/></div>' } } }
  })
  const button = wrapper.findAll('button').find((item) => item.text().includes('我的反馈'))
  expect(button).toBeDefined()
  expect(wrapper.find('[aria-label="有未读反馈回复"]').exists()).toBe(true)
  await button!.trigger('click')
  expect(ports.navigate).toHaveBeenCalledWith({ url: '/sub-packages/feedback/index' })
})
it('shows only an aggregate dot on the learning account entrance', () => {
  const wrapper = shallowMount(Learning, {
    global: { stubs: { AppPage: { template: '<div><slot/></div>' } } }
  })
  expect(wrapper.find('.account-link [aria-label="有未读反馈回复"]').exists()).toBe(true)
})
