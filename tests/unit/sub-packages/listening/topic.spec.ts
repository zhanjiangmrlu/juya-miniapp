// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: null as null | ((query: { id: string }) => void),
  show: null as null | (() => void),
  request: vi.fn(),
  home: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onReachBottom: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => 'owner' },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
vi.mock('@/features/listening/listening-service', () => ({ getListeningHome: ports.home }))
import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'
import Topic from '@/sub-packages/listening/topic.vue'
beforeEach(() => {
  ports.request.mockResolvedValue({
    items: [{ id: 'a1', version_id: 'v1', access: { can_learn: true } }],
    total: 1,
    next_cursor: null
  })
  ports.home.mockResolvedValue({
    continue_learning: {
      id: 'a1',
      version_id: 'v1',
      topic_id: 't1',
      progress: { reading_position: 20 },
      reading_paragraph: 2
    },
    topics: [
      {
        id: 't1',
        name: '真实主题',
        name_en: 'Real topic',
        description: '真实介绍',
        total_articles: 3,
        completed_articles: 2
      }
    ]
  })
})
/** 加载真实列表组合逻辑与主题元数据，避免从路由或示例猜测内容 */
const open = async () => {
  const page = shallowMount(Topic, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  ports.load?.({ id: 't1' })
  ports.show?.()
  await flushPromises()
  return page
}
it('loads the matching topic and real progress even when navigation supplied only its identity', async () => {
  const page = await open()
  expect(page.get('.topic-subtitle').text()).toBe('真实主题')
  expect(page.get('.topic-description').text()).toBe('真实介绍')
  expect(page.attributes('title')).toBe('Real topic')
  expect(page.text()).toContain('已学2篇')
  expect(page.get('.progress-fill').attributes('style')).toContain('66.666')
  expect(page.getComponent(ListeningArticleCard).props('article').progress?.reading_position).toBe(
    20
  )
  page.unmount()
})
it('does not invent completed counts when topic metadata is unavailable', async () => {
  ports.home.mockRejectedValueOnce(new Error('metadata unavailable'))
  const page = await open()
  expect(page.text()).not.toContain('已学0篇')
  expect(page.find('.topic-description').exists()).toBe(false)
  page.unmount()
})
