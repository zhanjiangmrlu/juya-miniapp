// @vitest-environment happy-dom
import { config, flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

config.global.stubs['scroll-view'] = { template: '<div><slot /></div>' }

const ports = vi.hoisted(() => ({
  owner: 'owner',
  show: undefined as undefined | (() => void),
  request: vi.fn()
}))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: { value: { unread: false, count: 0 } }, refresh: vi.fn() }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onPageScroll: vi.fn(),
  onHide: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onPullDownRefresh: vi.fn(),
  onReachBottom: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: {
    contentRequest: ports.request,
    request: ports.request,
    identity: () => ports.owner,
    userId: () => ports.owner
  },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    ensure: async () => true,
    restore: async () => ({ id: 'owner' }),
    refreshStatistics: async () => undefined,
    refreshAvatar: async () => undefined,
    statistics: { checked_in_today: false }
  })
}))
import LearningPage from '@/pages/learning/index.vue'
import { runtimeMode } from '@/services/runtime-mode'

beforeEach(() => {
  vi.clearAllMocks()
  ports.owner = 'owner'
  vi.stubGlobal('uni', { hideTabBar: vi.fn(), navigateTo: vi.fn(), switchTab: vi.fn() })
})
/** 载入给定发布范围的空待学列表
 * @param published 当前已发布卡片数量
 */
const open = async (published: number) => {
  ports.request.mockResolvedValue({ items: [], total: 0, published_total: published })
  const page = shallowMount(LearningPage, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' },
        AppState: {
          name: 'AppState',
          props: ['title', 'empty'],
          template: '<view v-if="empty"><text>{{ title }}</text><slot /></view>'
        }
      }
    }
  })
  ports.show?.()
  await flushPromises()
  return page
}
it('distinguishes all learned from no published cards and exposes the full learning-record row', async () => {
  const learned = await open(2)
  expect(learned.findComponent({ name: 'AppState' }).exists()).toBe(true)
  expect(
    learned
      .findAllComponents({ name: 'AppState' })
      .some((state) => state.props('title') === '当前场景卡已全部学完')
  ).toBe(true)
  expect(learned.findAll('button').some((button) => button.text() === '查看收藏')).toBe(true)
  await learned.get('.records-entry').trigger('click')
  expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/records/index' })
  learned.unmount()
  const empty = await open(0)
  expect(
    empty
      .findAllComponents({ name: 'AppState' })
      .some((state) => state.props('title') === '暂无可学习的场景卡')
  ).toBe(true)
  empty.unmount()
})

it('invalidates a pending private list when browseOnly starts so full mode can refresh the current list', async () => {
  let finish: (value: unknown) => void = () => undefined
  ports.request
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue({ items: [], total: 0, published_total: 2 })
  const page = shallowMount(LearningPage, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  ports.show?.()
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(1)
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await flushPromises()
  runtimeMode.update({ apiCategory: 'default' })
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(2)
  finish({ items: [{ id: 'old', name: '过期列表' }], total: 1, published_total: 1 })
  await flushPromises()
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(0)
  page.unmount()
})

it('removes the in-list refresh and home sharing sheet entries', async () => {
  const page = await open(2)
  expect(page.find('.share-entry').exists()).toBe(false)
  expect(page.findComponent({ name: 'ShareSheet' }).exists()).toBe(false)
  expect(page.find('.refresh-list').exists()).toBe(false)
  page.unmount()
})

it('loads the notes server collection including completed rows and keeps independent trustworthy totals on failures', async () => {
  const page = await open(8)
  ports.request.mockResolvedValueOnce({
    items: [{ id: 'review', name: '复习卡', state: { completed: true }, has_study_note: true }],
    total: 19,
    page: 1,
    limit: 3
  })
  await page.get('[data-tab="notes"]').trigger('click')
  await flushPromises()
  expect(ports.request.mock.calls.at(-1)?.[0]).toContain(
    '/cards?scope=published&has_study_note=true&page=1&limit='
  )
  expect(page.get('.catalog-count').text()).toBe('19 张')
  expect(page.findComponent({ name: 'SceneCard' }).props('source')).toBe('learning_notes')
  ports.request.mockRejectedValueOnce(new Error('离线'))
  await page.get('[data-tab="all"]').trigger('click')
  await flushPromises()
  expect(page.get('.catalog-count').text()).toBe('0 张')
  ports.request.mockRejectedValueOnce(new Error('离线'))
  await page.get('[data-tab="notes"]').trigger('click')
  await flushPromises()
  expect(page.get('.catalog-count').text()).toBe('19 张')
  expect(page.findComponent({ name: 'SceneCard' }).props('card').id).toBe('review')
  page.unmount()
})

it('keeps both tabs and does not invent zero for the first notes failure', async () => {
  const page = await open(8)
  ports.request.mockRejectedValueOnce(new Error('离线'))
  await page.get('[data-tab="notes"]').trigger('click')
  await flushPromises()
  expect(page.find('.catalog-count').exists()).toBe(false)
  expect(page.findAll('[data-tab]')).toHaveLength(2)
  expect(
    page
      .findAllComponents({ name: 'AppState' })
      .some((state) => state.props('title') === '暂无学习笔记')
  ).toBe(true)
  page.unmount()
})

it('clears every tab and its authorization context immediately when the stable account changes', async () => {
  const page = await open(8)
  const granted = { enabled: true, authorization: { status: 'active' } }
  ports.request.mockResolvedValueOnce({
    items: [{ id: 'owner-a', name: 'A的卡片' }],
    total: 7,
    learning_access: granted
  })
  await page.get('[data-tab="notes"]').trigger('click')
  await flushPromises()
  ports.request.mockResolvedValueOnce({ items: [], total: 5, learning_access: granted })
  await page.get('[data-tab="all"]').trigger('click')
  await flushPromises()
  ports.owner = 'owner-b'
  let fail!: (reason: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject
      })
  )
  ports.show?.()
  await flushPromises()
  expect(page.get('.learner-status').text()).not.toContain('授权有效')
  expect(page.find('.catalog-count').exists()).toBe(false)
  fail(new Error('B首屏离线'))
  await flushPromises()
  expect(page.get('.learner-status').text()).not.toContain('授权有效')
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(0)
  page.unmount()
})

it.each([
  ['notes', false],
  ['notes', true],
  ['all', false]
] as const)('ignores a stale pull after navigating to %s (failure %s)', async (tab, fail) => {
  const page = await open(8)
  let settle!: () => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        settle = () => (fail ? reject(new Error('离线')) : resolve({ items: [], total: 0 }))
      })
  )
  await page.get('.scene-scroll').trigger('refresherrefresh')
  await flushPromises()
  await page.get('[data-tab="notes"]').trigger('click')
  await flushPromises()
  if (tab === 'all') await page.get('[data-tab="all"]').trigger('click')
  const scroll = page.get('.scene-scroll')
  await scroll.trigger('scroll', { detail: { scrollTop: 510 } })
  settle()
  await flushPromises()
  expect(scroll.attributes('scroll-top')).toBe('510')
  page.unmount()
})

it('uses the new slogan and a single guest sync row in both scene tabs', async () => {
  ports.owner = ''
  const page = await open(2)
  expect(page.get('.home-title').text()).toBe('Let English grow with you')
  expect(page.get('.guest-list-intro > text').text()).toBe('登录后可同步收藏与学习记录')
  expect(page.get('.guest-login').text()).toBe('登录')
  await page.get('[data-tab="notes"]').trigger('click')
  await flushPromises()
  expect(page.get('.home-title').text()).toBe('Let English grow with you')
  page.unmount()
})
