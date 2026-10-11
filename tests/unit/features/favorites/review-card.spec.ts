// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewCard from '@/features/favorites/components/review-card.vue'

import type { FavoriteItem } from '@/shared/contracts/favorites'

const dependencies = vi.hoisted(() => ({ play: vi.fn() }))
vi.mock('@/stores/audio', () => ({
  useAudioStore: () => ({ playPronunciation: dependencies.play, snapshot: { status: 'IDLE' } })
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
  it('历史快照缺失状态明确展示，pronunciation=null不回退旧音频', async () => {
    const wrapper = mount(ReviewCard, {
      props: {
        face: 'BACK',
        item: {
          ...item,
          english: '',
          normalized_key: '',
          chinese: '',
          legacy_incomplete: true,
          missing_fields: ['english', 'meaning_zh', 'source_sentence'],
          pronunciation: null
        }
      }
    })
    expect(wrapper.text()).toContain('历史收藏资料待补齐')
    expect(wrapper.text()).toContain('英文')
    await wrapper.find('.card-word').trigger('click')
    expect(dependencies.play).not.toHaveBeenCalled()
    expect(wrapper.find('.card-audio').exists()).toBe(false)
    wrapper.unmount()
  })
  it('答案面的英文点击播放同一独立发音且不会翻面', async () => {
    const wrapper = mount(ReviewCard, { props: { face: 'BACK', item } })
    await wrapper.find('.card-word').trigger('click')
    expect(dependencies.play).toHaveBeenCalledWith(
      { target_id: 'latte', resource_version: 'r1', can_prepare: false },
      { favorite_id: 'one' }
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
  it('正面点击英文与喇叭共享发音，不触发翻面', async () => {
    const wrapper = mount(ReviewCard, { props: { face: 'FRONT', item } })
    await wrapper.find('.card-word').trigger('click')
    expect(wrapper.emitted('flip')).toBeUndefined()
    expect(dependencies.play).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
