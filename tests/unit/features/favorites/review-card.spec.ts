// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewCard from '@/features/favorites/components/review-card.vue'

import type { FavoriteItem } from '@/shared/contracts/favorites'

const dependencies = vi.hoisted(() => ({ play: vi.fn() }))
vi.mock('@/stores/audio', () => ({
  useAudioStore: () => ({ play: dependencies.play, snapshot: { status: 'IDLE' } })
}))
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => ({ scene: {} }) }))
const item: FavoriteItem = {
  id: 'one',
  entry_stable_id: 'latte',
  entry_type: 'VOCABULARY',
  normalized_key: 'latte',
  favorited_at: '',
  last_reviewed_at: null,
  sources: [],
  audio: { target_type: 'WORD', target_id: 'latte', version_id: 'r1' }
}
beforeEach(() => vi.clearAllMocks())
describe('翻卡答案英文发音', () => {
  it('答案面的英文点击播放同一独立发音且不会翻面', async () => {
    const wrapper = mount(ReviewCard, { props: { face: 'BACK', item } })
    await wrapper.find('.card-word').trigger('click')
    expect(dependencies.play).toHaveBeenCalledWith(
      { target_type: 'WORD', target_id: 'latte', version_id: 'r1' },
      {}
    )
    expect(wrapper.emitted('flip')).toBeUndefined()
    wrapper.unmount()
  })
  it('缺失独立发音时英文不播放且不显示喇叭', async () => {
    const wrapper = mount(ReviewCard, {
      props: { face: 'BACK', item: { ...item, audio: undefined } }
    })
    await wrapper.find('.card-word').trigger('click')
    expect(dependencies.play).not.toHaveBeenCalled()
    expect(wrapper.find('.card-audio').exists()).toBe(false)
    wrapper.unmount()
  })
  it('正面点击英文仍然翻面', async () => {
    const wrapper = mount(ReviewCard, { props: { face: 'FRONT', item } })
    await wrapper.find('.card-word').trigger('click')
    expect(wrapper.emitted('flip')).toHaveLength(1)
    expect(dependencies.play).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
