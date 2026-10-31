// @vitest-environment happy-dom
import { config, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

config.global.stubs['scroll-view'] = { template: '<div><slot /></div>' }

const ports = vi.hoisted(() => ({ show: undefined as (() => void) | undefined, home: vi.fn() }))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => {
    ports.show = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: { userId: () => 'owner' },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
vi.mock('@/features/listening/listening-service', () => ({
  getListeningHome: ports.home,
  openListeningArticle: vi.fn()
}))
import ListeningPage from '@/sub-packages/listening/index.vue'

beforeEach(() => {
  vi.stubGlobal('uni', { pageScrollTo: vi.fn() })
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
    list = page.get('.topic-scroll')
  expect(page.get('.listening-header').text()).toContain('上次阅读')
  expect(list.find('.continue').exists()).toBe(false)
  expect(list.find('.category-bar').exists()).toBe(false)
  expect(list.findAll('.topic')).toHaveLength(2)
  for (const id of ['c1', 'c2', 'all']) {
    await list.trigger('scroll', { detail: { scrollTop: 400 } })
    await page.get('#category-' + id).trigger('click')
    await flushPromises()
    expect(list.attributes('scroll-top')).toBe('0')
    expect(list.findAll('.topic')).toHaveLength(id === 'all' ? 2 : 1)
  }
  expect(uni.pageScrollTo).not.toHaveBeenCalled()
  page.unmount()
})
it('ends a failed list refresh while retaining topics and allowing retry', async () => {
  const page = await open(),
    list = page.get('.topic-scroll')
  ports.home.mockRejectedValueOnce(new Error('offline'))
  await list.trigger('refresherrefresh')
  await flushPromises()
  expect(list.attributes('refresher-triggered')).toBe('false')
  expect(list.findAll('.topic')).toHaveLength(2)
  expect(list.findComponent({ name: 'AppState' }).props('error')).toBe('offline')
  await list.trigger('refresherrefresh')
  await flushPromises()
  expect(list.findComponent({ name: 'AppState' }).props('error')).toBe('')
  page.unmount()
})
