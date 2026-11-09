// @vitest-environment happy-dom
import { config, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

config.global.stubs['scroll-view'] = { template: '<div><slot /></div>' }

const ports = vi.hoisted(() => ({
  show: undefined as (() => void) | undefined,
  home: vi.fn(),
  request: vi.fn(),
  load: undefined as ((query: Record<string, string>) => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onHide: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onUnload: vi.fn(),
  onLoad: (callback: (query: Record<string, string>) => void) => {
    ports.load = callback
  },
  onShow: (callback: () => void) => {
    ports.show = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: {
    identity: () => 'owner',
    userId: () => 'owner',
    contentRequest: ports.request,
    request: ports.request
  },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ restore: async () => null, ensure: async () => true })
}))
vi.mock('@/features/listening/listening-service', () => ({
  getListeningHome: ports.home,
  openListeningArticle: vi.fn()
}))
import ListeningPage from '@/sub-packages/listening/index.vue'

beforeEach(() => {
  vi.stubGlobal('uni', { pageScrollTo: vi.fn() })
  ports.request.mockImplementation(async (path: string) => ({
    items: path.includes('category_id=c1')
      ? [{ id: 'a1' }]
      : path.includes('category_id=c2')
        ? [{ id: 'a2' }]
        : [{ id: 'a1' }, { id: 'a2' }],
    total: path.includes('category_id=') ? 1 : 2,
    page: 1,
    limit: 20
  }))
  ports.home.mockResolvedValue({
    configured: true,
    categories: [
      { id: 'c1', name: '生活' },
      { id: 'c2', name: '工作' }
    ],
    topics: [
      { id: 't1', category_id: 'c1', name: '咖啡', total_articles: 1, completed_articles: 0 },
      { id: 't2', category_id: 'c2', name: '会议', total_articles: 2, completed_articles: 1 }
    ],
    continue_learning: { id: 'a1', topic_id: 't1', title_zh: '上次阅读', word_count: 20 }
  })
})
afterEach(() => vi.unstubAllGlobals())
/** 载入听读首页及真实页面筛选逻辑 */
const open = async () => {
  const page = shallowMount(ListeningPage, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' }
      }
    }
  })
  ports.show?.()
  await flushPromises()
  return page
}
it('keeps resume and categories outside the list and resets each category selection inside it', async () => {
  const page = await open(),
    list = page.get('.article-scroll')
  expect(page.get('.listening-header').text()).toContain('上次阅读')
  expect(list.find('.continue').exists()).toBe(false)
  expect(list.find('.category-bar').exists()).toBe(false)
  expect(list.findAllComponents({ name: 'ListeningArticleCard' })).toHaveLength(2)
  for (const id of ['c1', 'c2', 'all']) {
    await list.trigger('scroll', { detail: { scrollTop: 400 } })
    await page.get('#category-' + id).trigger('click')
    await flushPromises()
    expect(list.attributes('scroll-top')).toBe('0')
    expect(list.findAllComponents({ name: 'ListeningArticleCard' })).toHaveLength(
      id === 'all' ? 2 : 1
    )
  }
  expect(uni.pageScrollTo).not.toHaveBeenCalled()
  page.unmount()
})
it('ends a failed statistics refresh while retaining articles and allowing retry', async () => {
  const page = await open(),
    list = page.get('.article-scroll')
  ports.home.mockRejectedValueOnce(new Error('offline'))
  await list.trigger('refresherrefresh')
  await flushPromises()
  expect(list.attributes('refresher-triggered')).toBe('false')
  expect(list.findAllComponents({ name: 'ListeningArticleCard' })).toHaveLength(2)
  expect(page.get('.listening-header').findComponent({ name: 'AppState' }).props('error')).toBe(
    'offline'
  )
  expect(list.findComponent({ name: 'AppState' }).props('error')).toBe('')
  await list.trigger('refresherrefresh')
  await flushPromises()
  expect(page.get('.listening-header').findComponent({ name: 'AppState' }).props('error')).toBe('')
  page.unmount()
})

it('requests category articles directly and preserves loaded pages and scroll after returning from an article', async () => {
  const page = await open()
  await page.get('#category-c2').trigger('click')
  await flushPromises()
  expect(ports.request).toHaveBeenLastCalledWith(
    expect.stringContaining('/listening/articles?page=1&limit='),
    undefined
  )
  expect(ports.request.mock.calls.at(-1)?.[0]).toContain('category_id=c2')
  await page.get('.article-scroll').trigger('scroll', { detail: { scrollTop: 440 } })
  ports.show?.()
  await flushPromises()
  expect(page.get('.article-scroll').attributes('scroll-top')).toBe('440')
  expect(page.get('.continue-title').text()).toBe('上次阅读')
  page.unmount()
})

it('refreshes every loaded article page after returning and retries the failed next page without discarding rows', async () => {
  ports.request.mockImplementation(async (path: string) => ({
    items: path.includes('page=2') ? [{ id: 'a3' }, { id: 'a4' }] : [{ id: 'a1' }, { id: 'a2' }],
    total: 4,
    page: path.includes('page=2') ? 2 : 1,
    limit: 2
  }))
  const page = await open()
  const list = page.get('.article-scroll')
  ports.request.mockRejectedValueOnce(new Error('next page offline'))
  await list.trigger('scrolltolower')
  await flushPromises()
  expect(list.findAllComponents({ name: 'ListeningArticleCard' })).toHaveLength(2)
  expect(list.getComponent({ name: 'SceneListFooter' }).props('error')).toBe('next page offline')
  await list.trigger('scrolltolower')
  await flushPromises()
  expect(list.findAllComponents({ name: 'ListeningArticleCard' })).toHaveLength(4)
  await list.trigger('scroll', { detail: { scrollTop: 520 } })
  ports.request.mockClear()
  ports.show?.()
  await flushPromises()
  expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
    expect.stringContaining('/articles?page=1'),
    expect.stringContaining('/articles?page=2')
  ])
  expect(list.attributes('scroll-top')).toBe('520')
  expect(list.findAllComponents({ name: 'ListeningArticleCard' })).toHaveLength(4)
  page.unmount()
})
