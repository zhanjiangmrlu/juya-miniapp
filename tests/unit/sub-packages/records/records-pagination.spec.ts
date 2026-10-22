// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  show: undefined as undefined | (() => void),
  more: undefined as undefined | (() => void),
  scroll: undefined as undefined | ((event: { scrollTop: number }) => void),
  request: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onPageScroll: (callback: typeof ports.scroll) => {
    ports.scroll = callback
  },
  onUnload: vi.fn(),
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onReachBottom: (callback: typeof ports.more) => {
    ports.more = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'owner' },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    ensure: async () => true,
    refreshStatistics: async () => undefined,
    statistics: null
  })
}))
vi.mock('@/services/platform', () => ({ storage: { set: vi.fn(), get: vi.fn() } }))
import RecordsPage from '@/sub-packages/records/index.vue'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('uni', { switchTab: vi.fn() })
})

it('appends just the next record page, deduplicates rows, and retries that page after failure', async () => {
  ports.request
    .mockResolvedValueOnce({ items: [{ id: 'one', name: '第一张' }], total: 3, page: 1, limit: 2 })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      items: [
        { id: 'one', name: '第一张' },
        { id: 'two', name: '第二张' }
      ],
      total: 3,
      page: 2,
      limit: 2
    })
  const page = shallowMount(RecordsPage, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' },
        AppState: false,
        SceneListFooter: false,
        SceneCard: { props: ['card'], template: '<text class="record-card">{{card.name}}</text>' }
      }
    }
  })
  ports.show?.()
  await flushPromises()
  ports.more?.()
  await flushPromises()
  expect(page.findAll('.record-card').map((node) => node.text())).toEqual(['第一张'])
  expect(page.get('.list-footer').text()).toContain('加载失败，点击重试')
  expect(page.find('.notice.error').exists()).toBe(false)
  await page.get('.list-footer button').trigger('click')
  await flushPromises()
  expect(page.findAll('.record-card').map((node) => node.text())).toEqual(['第一张', '第二张'])
  expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
    '/api/mini/v1/me/learning-records?page=1&limit=20',
    '/api/mini/v1/me/learning-records?page=2&limit=20',
    '/api/mini/v1/me/learning-records?page=2&limit=20'
  ])
  expect(page.get('.list-footer').text()).toContain('已全部加载')
  page.unmount()
})

it('restores only the latest selected tab position when an earlier tab request finishes late', async () => {
  let finishCheckins: (value: unknown) => void = () => undefined,
    finishLearned: (value: unknown) => void = () => undefined
  const initial = { items: [{ id: 'one', name: '第一张' }], total: 1, page: 1, limit: 20 }
  ports.request
    .mockResolvedValueOnce(initial)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCheckins = resolve
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishLearned = resolve
        })
    )
  const scroll = vi.fn(({ complete }) => complete?.())
  vi.stubGlobal('uni', { pageScrollTo: scroll })
  const page = shallowMount(RecordsPage, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' }
      }
    }
  })
  ports.show?.()
  await flushPromises()
  ports.scroll?.({ scrollTop: 700 })
  await page.findAll('.tabs button')[1]!.trigger('click')
  await flushPromises()
  ports.scroll?.({ scrollTop: 0 })
  await page.findAll('.tabs button')[0]!.trigger('click')
  await flushPromises()
  finishLearned(initial)
  await flushPromises()
  finishCheckins({ items: [], total: 0, page: 1, limit: 20 })
  await flushPromises()
  expect(scroll.mock.calls.map(([value]) => value.scrollTop)).toEqual([700])
  page.unmount()
})
