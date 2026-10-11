// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import ReadingListPage from '@/sub-packages/short-reading/index.vue'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => unknown) | undefined,
  history: vi.fn(),
  preview: vi.fn(),
  navigate: vi.fn(),
  session: { isAuthenticated: true, profile: { juya_id: 'one' }, cleanupGeneration: 0 }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (hook: typeof dependencies.show) => {
    dependencies.show = hook
  },
  onHide: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    shortReading: { history: dependencies.history, preview: dependencies.preview }
  })
}))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/shared/use-page-scroll-lock', () => ({
  usePageScrollLock: () => ({ pageStyle: ref('') })
}))
vi.mock('@/features/short-reading/use-short-reading-list', () => ({
  useShortReadingList: () => ({
    items: ref([]),
    loading: ref(false),
    unavailable: ref(true),
    appendFailed: ref(false),
    nextCursor: ref(null),
    load: vi.fn(),
    open: vi.fn()
  })
}))
const page = {
  items: [
    {
      content_id: 'offline',
      title_en: '',
      title_zh: '短文已下线',
      saved_content_version: 1,
      started_at: '2026-10-10T00:00:00Z',
      last_read_at: '2026-10-11T01:00:00Z',
      completed_at: '2026-10-11T01:00:00Z',
      can_open: false
    }
  ],
  started_count: 35,
  completed_count: 22,
  has_more: true,
  next_cursor: 'next'
}
beforeEach(() => {
  vi.resetAllMocks()
  dependencies.session = reactive({
    isAuthenticated: true,
    profile: { juya_id: 'one' },
    cleanupGeneration: 0
  })
  dependencies.history.mockResolvedValue(page)
  dependencies.preview.mockRejectedValue({ status: 404 })
})
const render = () =>
  mount(ReadingListPage, {
    global: {
      stubs: {
        ShortReadingPageLayout: { template: '<div><slot /></div>' },
        'page-meta': true,
        'scroll-view': { template: '<div><slot /></div>' }
      }
    }
  })
it('在既有短文列表展示独立阅读记录，下线摘要与服务端已读总数不依赖当前目录可用', async () => {
  const wrapper = render()
  dependencies.show?.()
  await flushPromises()
  expect(wrapper.text()).toContain('我的阅读记录')
  expect(wrapper.text()).toContain('已读完 22 篇')
  expect(wrapper.text()).toContain('已开始 35 篇')
  expect(wrapper.text()).toContain('短文已下线')
  expect(wrapper.text()).not.toContain('完成场景')
  expect(wrapper.find('.reading-history-card').text()).toContain('已读完')
  await wrapper.find('.reading-history-card').trigger('click')
  await flushPromises()
  expect(dependencies.navigate).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('短文已下线，阅读记录已保留')
  expect(wrapper.findAll('button').some((button) => button.text() === '加载更多阅读记录')).toBe(
    true
  )
  dependencies.session.cleanupGeneration++
  await flushPromises()
  expect(wrapper.text()).not.toContain('短文已下线')
  expect(wrapper.text()).not.toContain('已读完 22 篇')
  wrapper.unmount()
})
