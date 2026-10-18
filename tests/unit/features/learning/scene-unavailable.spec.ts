// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({ media: vi.fn(), back: vi.fn() }))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/services/navigation', () => ({ backTo: ports.back }))

it('uses only the permitted summary thumbnail and returns to the original list', async () => {
  ports.media.mockResolvedValue('/safe-thumbnail')
  const { default: SceneUnavailable } =
    await import('@/features/learning/components/scene-unavailable.vue')
  const page = mount(SceneUnavailable, {
    props: {
      summary: {
        id: 'old-card',
        name: '历史场景',
        title_en: 'A Historic Scene',
        thumbnail_id: 'safe-thumb',
        version_id: null,
        available: false,
        unavailable_reason: 'deleted',
        state: { completed: true, today_completed: false, favorite: true }
      },
      favoriteBusy: false,
      message: ''
    }
  })
  await flushPromises()
  expect(ports.media).toHaveBeenCalledExactlyOnceWith('old-card', 'safe-thumb', null, true)
  expect(page.find('audio').exists()).toBe(false)
  expect(page.text()).toContain('已有学习记录和打卡数据会保留')
  expect(page.text()).toContain('A Historic Scene')
  await page.findAll('button')[0]!.trigger('click')
  expect(page.emitted('unfavorite')).toHaveLength(1)
  await page.findAll('button')[1]!.trigger('click')
  expect(ports.back).toHaveBeenCalledOnce()
  await page.setProps({ summary: { ...page.props('summary'), thumbnail_id: null } })
  await flushPromises()
  expect(page.find('image').exists()).toBe(false)
  expect(ports.media).toHaveBeenCalledTimes(1)
  page.unmount()
})
