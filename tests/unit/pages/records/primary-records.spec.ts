// @vitest-environment happy-dom
import { config, flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

config.global.stubs['scroll-view'] = { template: '<div><slot /></div>' }

const ports = vi.hoisted(() => ({
  show: [] as (() => void)[],
  stored: 'listening',
  request: vi.fn(),
  refresh: vi.fn(),
  sceneMore: vi.fn(),
  checkinMore: vi.fn(),
  listeningMore: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => ports.show.push(callback),
  onReachBottom: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/api', () => ({ session: { request: ports.request, userId: () => 'learner' } }))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
vi.mock('@/composables/use-scene-list', () => ({
  useSceneList: (options: { path: string }) => ({
    refresh: ports.refresh,
    dispose: vi.fn(),
    more: options.path.endsWith('/checkins') ? ports.checkinMore : ports.sceneMore,
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
  default: {
    template: '<div />',
    setup: (_props: unknown, { expose }: { expose: (value: unknown) => void }) => {
      expose({ more: ports.listeningMore })
    }
  }
}))
import Records from '@/pages/records/index.vue'

beforeEach(() => {
  vi.clearAllMocks()
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

it('loads more only for the scrolled tab and keeps all three scroll areas alive across tab changes', async () => {
  const page = mount(Records)
  document.body.appendChild(page.element)
  ports.show.forEach((callback) => callback())
  await flushPromises()
  const areas = page.findAll('.record-scroll')
  expect(areas).toHaveLength(3)
  const scene = areas[0]!,
    listening = areas[1]!,
    checkins = areas[2]!
  expect(listening.isVisible()).toBe(true)
  await listening.trigger('scrolltolower')
  expect(ports.listeningMore).toHaveBeenCalledOnce()
  expect(ports.sceneMore).not.toHaveBeenCalled()
  await page.findAll('.tabs button')[0]!.trigger('click')
  expect(scene.isVisible()).toBe(true)
  expect(listening.isVisible()).toBe(false)
  await scene.trigger('scrolltolower')
  expect(ports.sceneMore).toHaveBeenCalledOnce()
  await page.findAll('.tabs button')[2]!.trigger('click')
  await checkins.trigger('scrolltolower')
  expect(ports.checkinMore).toHaveBeenCalledOnce()
  expect(page.findAll('.record-scroll')[0]!.element).toBe(scene.element)
  expect(page.findAll('.record-scroll')[1]!.element).toBe(listening.element)
  expect(scene.find('.tabs').exists()).toBe(false)
  expect(listening.find('.record-summary').exists()).toBe(false)
  page.element.remove()
  page.unmount()
})
