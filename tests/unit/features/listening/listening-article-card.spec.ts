// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

vi.mock('@/features/listening/use-listening-thumbnail', () => ({
  useListeningThumbnail: () => ({ thumbnail: '', imageError: false, retryThumbnail: vi.fn() })
}))
vi.mock('@/services/api', () => ({
  session: { identity: () => 'owner', userId: () => 'owner' },
  onSessionExpired: () => () => undefined
}))
import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'

it('retains completion and category metadata alongside a restricted access badge', () => {
  const page = mount(ListeningArticleCard, {
    props: {
      article: {
        id: 'a1',
        category_id: 'c1',
        category_name: '生活',
        category_order: 0,
        content_type: 'listening',
        topic_id: null,
        title_zh: '文章',
        title_en: 'Article',
        tags: [],
        word_count: 20,
        version_id: 'v1',
        available: true,
        thumbnail_url: null,
        access: {
          can_learn: false,
          can_lookup: false,
          is_free: false,
          reason: 'grant_required',
          server_now: '2026-11-01T00:00:00Z',
          expires_at: null,
          version: 'a1'
        },
        state: { favorite: false, completed: true, today_completed: false }
      }
    }
  })
  expect(page.text()).toContain('生活')
  expect(page.text()).toContain('暂未开放')
  expect(page.text()).toContain('已学过 · 可以复习')
  page.unmount()
})
