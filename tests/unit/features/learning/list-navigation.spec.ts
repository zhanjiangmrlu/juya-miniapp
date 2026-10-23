// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  show: undefined as undefined | (() => void),
  hide: undefined as undefined | (() => void),
  pull: undefined as undefined | (() => Promise<void>),
  more: undefined as undefined | (() => void),
  scroll: undefined as undefined | ((event: { scrollTop: number }) => void),
  request: vi.fn(),
  owner: 'owner'
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onUnload: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onHide: (callback: typeof ports.hide) => {
    ports.hide = callback
  },
  onPullDownRefresh: (callback: typeof ports.pull) => {
    ports.pull = callback
  },
  onReachBottom: (callback: typeof ports.more) => {
    ports.more = callback
  },
  onPageScroll: (callback: typeof ports.scroll) => {
    ports.scroll = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => ports.owner },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: { value: { unread: false } }, refresh: vi.fn() }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    ensure: async () => true,
    refreshStatistics: vi.fn(),
    refreshAvatar: vi.fn(),
    profile: { id: 'owner' },
    statistics: null
  })
}))
import FavoritesPage from '@/pages/favorites/index.vue'
import LearningPage from '@/pages/learning/index.vue'

beforeEach(() => {
  vi.resetAllMocks()
  ports.owner = 'owner'
  vi.stubGlobal('uni', {
    hideTabBar: vi.fn(),
    getWindowInfo: () => ({ windowWidth: 375, windowHeight: 812 }),
    pageScrollTo: vi.fn(),
    stopPullDownRefresh: vi.fn(),
    hideShareMenu: vi.fn()
  })
})
afterEach(() => vi.unstubAllGlobals())

it.each([
  [LearningPage, '/api/mini/v1/cards', 2],
  [FavoritesPage, '/api/mini/v1/favorites', 4]
] as const)(
  'retains the read range and scroll for %s with native refresh and bottom error state',
  async (component, path, limit) => {
    ports.request.mockImplementation(async (url: string) => ({
      items: [{ id: url, name: url }],
      total: 99
    }))
    const page = shallowMount(component, {
      global: {
        stubs: {
          AppPage: { template: '<view><slot/></view>' },
          SceneListFooter: false,
          SceneCard: { props: ['card'], template: '<text class="row">{{card.name}}</text>' }
        }
      }
    })
    ports.show?.()
    await flushPromises()
    ports.more?.()
    await flushPromises()
    ports.scroll?.({ scrollTop: 820 })
    ports.hide?.()
    ports.show?.()
    await flushPromises()
    expect(ports.request.mock.calls.slice(-2).map(([url]) => url)).toEqual([
      `${path}?page=1&limit=${limit}`,
      `${path}?page=2&limit=${limit}`
    ])
    expect(uni.pageScrollTo).toHaveBeenLastCalledWith({ scrollTop: 820, duration: 0 })
    const rows = page.findAll('.row').map((node) => node.text())
    ports.request.mockRejectedValue(new Error('offline'))
    await ports.pull?.()
    await flushPromises()
    expect(uni.stopPullDownRefresh).toHaveBeenCalledOnce()
    expect(page.findAll('.row').map((node) => node.text())).toEqual(rows)
    expect(page.get('.list-footer').text()).toContain('offline')
    expect(page.find('.refresh-list').exists()).toBe(false)
    expect(page.find('.share-entry').exists()).toBe(false)
    page.unmount()
  }
)

it.each([LearningPage, FavoritesPage])(
  'does not restore an old list scroll while its detail is visible for %s',
  async (component) => {
    ports.request.mockResolvedValue({ items: [{ id: 'one' }], total: 1 })
    const page = shallowMount(component, {
      global: { stubs: { AppPage: { template: '<view><slot/></view>' } } }
    })
    ports.show?.()
    await flushPromises()
    ports.scroll?.({ scrollTop: 740 })
    let finish: (value: unknown) => void = () => undefined
    ports.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    ports.show?.()
    await flushPromises()
    ports.hide?.()
    finish({ items: [{ id: 'one' }], total: 1 })
    await flushPromises()
    expect(uni.pageScrollTo).not.toHaveBeenCalled()
    page.unmount()
  }
)

it.each([
  [LearningPage, '/api/mini/v1/cards', 3],
  [FavoritesPage, '/api/mini/v1/favorites', 5]
] as const)(
  'pulls only a new first page while return refresh keeps the read range for %s',
  async (component, path, newLimit) => {
    ports.request.mockImplementation(async (url: string) => ({
      items: [{ id: url, name: url }],
      total: 99
    }))
    const page = shallowMount(component, {
      global: {
        stubs: {
          AppPage: { template: '<view><slot/></view>' },
          SceneCard: { props: ['card'], template: '<text class="row">{{card.name}}</text>' }
        }
      }
    })
    ports.show?.()
    await flushPromises()
    ports.more?.()
    await flushPromises()
    vi.stubGlobal('uni', {
      ...uni,
      getWindowInfo: () => ({ windowWidth: 375, windowHeight: 1000 })
    })
    const before = ports.request.mock.calls.length
    await ports.pull?.()
    await flushPromises()
    expect(ports.request.mock.calls.slice(before).map(([url]) => url)).toEqual([
      `${path}?page=1&limit=${newLimit}`
    ])
    expect(page.findAll('.row')).toHaveLength(1)
    ports.show?.()
    await flushPromises()
    expect(ports.request.mock.calls.at(-1)?.[0]).toBe(`${path}?page=1&limit=${newLimit}`)
    ports.more?.()
    await flushPromises()
    expect(ports.request.mock.calls.at(-1)?.[0]).toBe(`${path}?page=2&limit=${newLimit}`)
    page.unmount()
  }
)
