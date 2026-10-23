// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  pull: undefined as undefined | (() => Promise<void>),
  show: undefined as undefined | (() => void),
  more: undefined as undefined | (() => void),
  scroll: undefined as undefined | ((event: { scrollTop: number }) => void),
  request: vi.fn(),
  statistics: null as null | { completed_cards: number; total_checkin_days: number }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onHide: vi.fn(),
  onPullDownRefresh: (callback: typeof ports.pull) => {
    ports.pull = callback
  },
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
    statistics: ports.statistics
  })
}))
vi.mock('@/services/platform', () => ({ storage: { set: vi.fn(), get: vi.fn() } }))
import RecordsPage from '@/sub-packages/records/index.vue'

beforeEach(() => {
  vi.resetAllMocks()
  ports.statistics = null
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
    '/api/mini/v1/me/learning-records?page=1&limit=2',
    '/api/mini/v1/me/learning-records?page=2&limit=2',
    '/api/mini/v1/me/learning-records?page=2&limit=2'
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

it('uses native pull refresh and preserves all read pages and scroll on return', async () => {
  ports.request.mockImplementation(async (path: string) => ({
    items: [{ id: path, name: path }],
    total: 30,
    page: Number(new URL('https://local' + path).searchParams.get('page')),
    limit: 2
  }))
  const scroll = vi.fn(),
    stop = vi.fn()
  vi.stubGlobal('uni', { pageScrollTo: scroll, stopPullDownRefresh: stop })
  const page = shallowMount(RecordsPage, {
    global: { stubs: { AppPage: { template: '<view><slot/></view>' } } }
  })
  ports.show?.()
  await flushPromises()
  ports.more?.()
  await flushPromises()
  ports.scroll?.({ scrollTop: 700 })
  ports.show?.()
  await flushPromises()
  expect(ports.request.mock.calls.slice(-2).map(([path]) => path)).toEqual([
    '/api/mini/v1/me/learning-records?page=1&limit=2',
    '/api/mini/v1/me/learning-records?page=2&limit=2'
  ])
  expect(scroll).toHaveBeenLastCalledWith(expect.objectContaining({ scrollTop: 700, duration: 0 }))
  await ports.pull?.()
  expect(stop).toHaveBeenCalledOnce()
  page.unmount()
})

it('does not offer another page when the server returns no displayable learning records', async () => {
  ports.request.mockResolvedValue({ items: [], total: 0, page: 1, limit: 2 })
  const page = shallowMount(RecordsPage, {
    global: { stubs: { AppPage: { template: '<view><slot/></view>' }, SceneListFooter: false } }
  })
  ports.show?.()
  await flushPromises()
  expect(page.get('.list-footer').text()).not.toContain('加载更多')
  page.unmount()
})

it('uses filtered server counts while retaining historical statistics and an offline safe summary', async () => {
  ports.statistics = { completed_cards: 4, total_checkin_days: 3 }
  ports.request.mockResolvedValue({
    items: [
      { id: 'active', name: '仍发布的场景', available: true },
      { id: 'offline', name: '下线安全摘要', available: false, unavailable_reason: 'offline' }
    ],
    total: 2,
    page: 1,
    limit: 2
  })
  const page = shallowMount(RecordsPage, {
    global: { stubs: { AppPage: { template: '<view><slot/></view>' } } }
  })
  ports.show?.()
  await flushPromises()
  expect(page.findAll('.tabs button')[0]!.text()).toBe('已学卡片 2')
  expect(page.findComponent({ name: 'LearningStatistics' }).props('statistics')).toMatchObject({
    completed_cards: 4,
    total_checkin_days: 3
  })
  expect(
    page.findAllComponents({ name: 'SceneCard' }).map((card) => card.props('card').id)
  ).toEqual(['active', 'offline'])
  page.unmount()
})

it('explains an empty displayable record list without implying preserved learning results were erased', async () => {
  ports.statistics = { completed_cards: 1, total_checkin_days: 1 }
  ports.request.mockResolvedValue({ items: [], total: 0, page: 1, limit: 2 })
  const page = shallowMount(RecordsPage, {
    global: { stubs: { AppPage: { template: '<view><slot/></view>' }, AppState: false } }
  })
  ports.show?.()
  await flushPromises()
  expect(page.text()).toContain('暂无可展示的已学卡片')
  expect(page.text()).toContain('学习成绩和打卡记录会保留，可返回学习页查看其他场景。')
  expect(page.text()).not.toContain('完成一张场景卡，开始记录学习')
  expect(page.findComponent({ name: 'LearningStatistics' }).props('statistics')).toMatchObject({
    completed_cards: 1,
    total_checkin_days: 1
  })
  page.unmount()
})

it('retries a retained-record refresh from its footer error button', async () => {
  ports.request
    .mockResolvedValueOnce({
      items: [{ id: 'one', name: '已读卡片' }],
      total: 1,
      page: 1,
      limit: 2
    })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({
      items: [{ id: 'one', name: '恢复后的卡片' }],
      total: 1,
      page: 1,
      limit: 2
    })
  vi.stubGlobal('uni', { stopPullDownRefresh: vi.fn() })
  const page = shallowMount(RecordsPage, {
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
  await ports.pull?.()
  await flushPromises()
  expect(page.get('.row').text()).toBe('已读卡片')
  expect(page.get('.list-footer').text()).toContain('刷新失败，点击重试')
  await page.get('.list-footer button').trigger('click')
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(3)
  expect(page.get('.row').text()).toBe('恢复后的卡片')
  page.unmount()
})

it('keeps each tab position across repeated switches when native scroll events precede completion', async () => {
  ports.request.mockImplementation(async (path: string) => ({
    items: path.includes('learning-records') ? [{ id: 'one', name: '已学卡片' }] : [],
    total: path.includes('learning-records') ? 1 : 0,
    page: 1,
    limit: 2
  }))
  const scroll = vi.fn(({ scrollTop, complete }: { scrollTop: number; complete?: () => void }) => {
    ports.scroll?.({ scrollTop })
    complete?.()
  })
  vi.stubGlobal('uni', { pageScrollTo: scroll })
  const page = shallowMount(RecordsPage, {
    global: { stubs: { AppPage: { template: '<view><slot/></view>' } } }
  })
  ports.show?.()
  await flushPromises()
  ports.scroll?.({ scrollTop: 700 })
  for (const index of [1, 0, 1, 0]) {
    await page.findAll('.tabs button')[index]!.trigger('click')
    await flushPromises()
  }
  expect(scroll.mock.calls.map(([options]) => options.scrollTop)).toEqual([0, 700, 0, 700])
  page.unmount()
})

it('starts only the records first page on native pull while return reloads all already read pages', async () => {
  ports.request.mockImplementation(async (path: string) => ({
    items: [{ id: path, name: path }],
    total: 99
  }))
  vi.stubGlobal('uni', { pageScrollTo: vi.fn(), stopPullDownRefresh: vi.fn() })
  const page = shallowMount(RecordsPage, {
    global: { stubs: { AppPage: { template: '<view><slot/></view>' } } }
  })
  ports.show?.()
  await flushPromises()
  ports.more?.()
  await flushPromises()
  ports.show?.()
  await flushPromises()
  expect(ports.request.mock.calls.slice(-2).map(([path]) => path)).toEqual([
    '/api/mini/v1/me/learning-records?page=1&limit=2',
    '/api/mini/v1/me/learning-records?page=2&limit=2'
  ])
  vi.stubGlobal('uni', { ...uni, getWindowInfo: () => ({ windowWidth: 375, windowHeight: 1000 }) })
  const before = ports.request.mock.calls.length
  await ports.pull?.()
  await flushPromises()
  expect(ports.request.mock.calls.slice(before).map(([path]) => path)).toEqual([
    '/api/mini/v1/me/learning-records?page=1&limit=5'
  ])
  ports.more?.()
  await flushPromises()
  expect(ports.request.mock.calls.at(-1)?.[0]).toBe(
    '/api/mini/v1/me/learning-records?page=2&limit=5'
  )
  expect(uni.stopPullDownRefresh).toHaveBeenCalledOnce()
  page.unmount()
})
