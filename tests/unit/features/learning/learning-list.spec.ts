// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({ show: undefined as undefined | (() => void), request: vi.fn() }))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: { value: { unread: false, count: 0 } }, refresh: vi.fn() }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
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
vi.mock('@/services/api', () => ({ session: { request: ports.request } }))
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
  vi.stubGlobal('uni', { hideTabBar: vi.fn(), navigateTo: vi.fn() })
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
  expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/sub-packages/records/index' })
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
