// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  show: [] as (() => void)[],
  stored: 'listening',
  request: vi.fn(),
  refresh: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => ports.show.push(callback),
  onReachBottom: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/api', () => ({ session: { request: ports.request, userId: () => 'learner' } }))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
vi.mock('@/composables/use-scene-list', () => ({
  useSceneList: () => ({
    refresh: ports.refresh,
    dispose: vi.fn(),
    more: vi.fn(),
    items: { value: [] },
    total: { value: 0 },
    busy: { value: false },
    moreBusy: { value: false },
    error: { value: '' },
    moreError: { value: '' },
    hasMore: { value: false },
    done: { value: true }
  })
}))
vi.mock('@/components/app-page/app-page.vue', () => ({
  default: { template: '<div><slot /></div>' }
}))
vi.mock('@/components/app-bottom-tabs/app-bottom-tabs.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/components/app-state/app-state.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/learning/components/scene-card.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/features/learning/components/scene-list-footer.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/features/listening/components/listening-article-card.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/features/listening/components/listening-collection.vue', () => ({
  default: { template: '<div />' }
}))
import Records from '@/pages/records/index.vue'

beforeEach(() => {
  ports.show.length = 0
  ports.stored = 'listening'
  ports.request.mockResolvedValue({
    completed_cards: 2,
    completed_articles: 4,
    current_streak: 3,
    total_checkin_days: 7,
    checked_in_today: true
  })
  vi.stubGlobal('uni', {
    hideTabBar: vi.fn(),
    getStorageSync: () => ports.stored,
    setStorageSync: (_key: string, value: string) => {
      ports.stored = value
    }
  })
})

it('restores the primary listening tab and renders the server checkin status', async () => {
  const page = mount(Records, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot /></div>' },
        AppBottomTabs: true,
        AppState: true,
        ListeningCollection: true,
        SceneListFooter: true
      }
    }
  })
  ports.show.forEach((callback) => callback())
  await flushPromises()
  expect(page.get('.tabs .active').text()).toBe('已学听读')
  const text = page.text().replace(/\s+/g, '')
  expect(text).toContain('连续打卡3天')
  expect(text).toContain('累计打卡7天')
  expect(text).toContain('今日已打卡')
  expect(text).not.toContain('>')
  expect(text).not.toContain('&gt;')
  page.unmount()
})
