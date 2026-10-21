// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

import SceneCard from '@/features/learning/components/scene-card.vue'
const ports = vi.hoisted(() => ({
  media: vi.fn(async () => '/thumbnail'),
  request: vi.fn(),
  thumbnail: vi.fn()
}))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/services/api', () => ({ session: { userId: () => 'learner', request: ports.request } }))
vi.mock('@/services/client-thumbnail', () => ({ clientThumbnail: ports.thumbnail }))
beforeEach(() => vi.clearAllMocks())
vi.mock('@/services/navigation', () => ({ openScene: vi.fn() }))
it('renders the published English title above Chinese and keeps its WebP thumbnail when list state refreshes', async () => {
  const card = {
    id: 'one',
    version_id: 'v1',
    name: '晨间慢慢活动身体',
    title_en: 'A Gentle Start to the Morning',
    thumbnail_id: 'thumb',
    published_at: '',
    vocabulary_count: 10,
    chunk_count: 5,
    state: { completed: false, today_completed: false, favorite: false }
  }
  const page = mount(SceneCard, { props: { card } })
  await flushPromises()
  expect(page.get('.scene-english').text()).toBe(card.title_en)
  expect(
    page
      .get('.scene-copy')
      .findAll('text')
      .map((node) => node.text())
      .slice(0, 2)
  ).toEqual([card.title_en, card.name])
  expect(page.get('.thumbnail image').attributes('webp')).toBe('true')
  expect(page.get('.thumbnail image').attributes('src')).toBe('/thumbnail?thumbnail=list')
  await page.setProps({ card: { ...card, state: { ...card.state, completed: true } } })
  await flushPromises()
  expect(ports.media).toHaveBeenCalledTimes(1)
  expect(page.text()).toContain('已学过')
  page.unmount()
})

it('generates the current publication thumbnail from its authorized original when metadata is absent', async () => {
  ports.request.mockResolvedValue({ content: { image_id: 'published-original' } })
  ports.thumbnail.mockImplementation(async (_key, load) => {
    await load()
    return { thumbnailSrc: '/generated-small.jpg', originalSrc: '/original.png' }
  })
  const page = mount(SceneCard, {
    props: {
      card: {
        id: 'missing',
        version_id: 'v1',
        name: '无缩略图',
        title_en: 'Missing thumbnail',
        thumbnail_id: null,
        published_at: '',
        vocabulary_count: 0,
        chunk_count: 0,
        state: { completed: false, today_completed: false, favorite: false }
      }
    }
  })
  await flushPromises()
  expect(ports.request).toHaveBeenCalledExactlyOnceWith('/api/mini/v1/cards/missing?version_id=v1')
  expect(ports.media).toHaveBeenCalledExactlyOnceWith(
    'missing',
    'published-original',
    'v1',
    false,
    false
  )
  expect(page.get('.thumbnail image').attributes('src')).toBe('/generated-small.jpg')
  page.unmount()
})

it('does not request an original or generate a thumbnail for unavailable history', async () => {
  const page = mount(SceneCard, {
    props: {
      history: true,
      card: {
        id: 'offline',
        version_id: null,
        name: '下线卡片',
        title_en: 'Offline',
        thumbnail_id: null,
        available: false,
        unavailable_reason: 'offline',
        state: { completed: false, today_completed: false, favorite: false }
      }
    }
  })
  await flushPromises()
  expect(ports.request).not.toHaveBeenCalled()
  expect(ports.thumbnail).not.toHaveBeenCalled()
  expect(ports.media).not.toHaveBeenCalled()
  expect(page.find('.thumbnail image').exists()).toBe(false)
  page.unmount()
})
