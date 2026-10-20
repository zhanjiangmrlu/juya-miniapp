// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import SceneCard from '@/features/learning/components/scene-card.vue'
const ports = vi.hoisted(() => ({ media: vi.fn(async () => '/thumbnail') }))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
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
  await page.setProps({ card: { ...card, state: { ...card.state, completed: true } } })
  await flushPromises()
  expect(ports.media).toHaveBeenCalledTimes(1)
  expect(page.text()).toContain('已学过')
  page.unmount()
})
