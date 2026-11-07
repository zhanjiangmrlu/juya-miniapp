// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  owner: null as string | null,
  expired: () => undefined as void,
  show: () => undefined as void,
  request: vi.fn(),
  ensure: vi.fn(),
  restore: vi.fn(async () => null)
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => void) => {
    ports.show = cb
  },
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { userId: () => ports.owner, identity: () => '0:guest', contentRequest: ports.request },
  onSessionExpired: (cb: () => void) => {
    ports.expired = cb
    return () => undefined
  }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ profile: null, restore: ports.restore, ensure: ports.ensure })
}))
vi.mock('@/services/navigation', () => ({ openLogin: vi.fn(), backTo: vi.fn() }))
import Home from '@/pages/home/index.vue'
beforeEach(() => {
  vi.clearAllMocks()
  ports.owner = null
})
it('loads real free totals for guests without reading personal statistics or forcing login', async () => {
  ports.request.mockResolvedValue({
    categories: [],
    statistics: null,
    authorization: null,
    continue_learning: null,
    scene_free_count: 2,
    scene_actual_free_count: 2,
    actual_free_count: 1,
    free_count: 1
  })
  vi.stubGlobal('uni', { hideTabBar: vi.fn(), navigateTo: vi.fn() })
  const wrapper = mount(Home, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot /><slot name="footer" /></div>' },
        AppBottomTabs: true,
        AppState: true,
        'scroll-view': { template: '<div><slot /></div>' }
      }
    }
  })
  ports.show()
  await flushPromises()
  expect(ports.ensure).not.toHaveBeenCalled()
  expect(ports.request).toHaveBeenCalledExactlyOnceWith('/api/mini/v1/listening/home')
  expect(wrapper.text()).toContain('免费开放2张 · 直接体验')
  expect(wrapper.text()).toContain('登录，保存学习记录')
  expect(wrapper.text()).not.toContain('已学0')
  expect(wrapper.text()).not.toContain('连续打卡')
  wrapper.unmount()
})

it('clears cached personal counts immediately when an existing home session expires', async () => {
  ports.owner = 'A'
  ports.request.mockResolvedValueOnce({
    categories: [],
    statistics: {
      completed_cards: 9,
      completed_articles: 8,
      current_streak: 7,
      checked_in_today: true
    },
    scene_free_count: 2,
    scene_actual_free_count: 2,
    free_count: 1,
    actual_free_count: 1
  })
  vi.stubGlobal('uni', { hideTabBar: vi.fn() })
  const wrapper = mount(Home, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot /><slot name="footer" /></div>' },
        AppBottomTabs: true,
        AppState: true,
        'scroll-view': { template: '<div><slot /></div>' }
      }
    }
  })
  ports.show()
  await flushPromises()
  expect(wrapper.text()).toContain('已学9张')
  ports.owner = null
  ports.request.mockReturnValue(new Promise(() => undefined))
  ports.expired()
  await flushPromises()
  expect(wrapper.text()).not.toContain('已学9张')
  expect(wrapper.text()).not.toContain('连续打卡7天')
  wrapper.unmount()
})
