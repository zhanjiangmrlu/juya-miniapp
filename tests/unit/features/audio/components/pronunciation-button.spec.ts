// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import PronunciationButton from '@/features/audio/components/pronunciation-button.vue'

const dependencies = vi.hoisted(() => ({
  play: vi.fn(),
  snapshot: { target: null, status: 'IDLE' },
  currentKey: null
}))
vi.mock('@/stores/audio', () => ({
  useAudioStore: () => ({
    playPronunciation: dependencies.play,
    snapshot: dependencies.snapshot,
    currentKey: dependencies.currentKey
  })
}))

describe('独立发音按钮', () => {
  it('没有受控目标或服务端不可用时隐藏按钮', () => {
    expect(
      mount(PronunciationButton, { props: { context: {} } })
        .find('button')
        .exists()
    ).toBe(false)
    expect(
      mount(PronunciationButton, {
        props: { context: {}, target: { target_id: 'word', status: 'UNAVAILABLE' } }
      })
        .find('button')
        .exists()
    ).toBe(false)
  })
  it('没有上传版本且后台明确禁止准备时直接隐藏喇叭', () => {
    const wrapper = mount(PronunciationButton, {
      props: { context: {}, target: { target_id: 'unavailable-word', can_prepare: false } }
    })
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })
  it('点击只播放受控目标，不向外层传递收藏或翻卡事件', async () => {
    const target = { target_id: 'word', can_prepare: true }
    const context = { favorite_id: 'favorite' }
    const wrapper = mount(PronunciationButton, { props: { target, context } })
    await wrapper.get('button').trigger('click')
    expect(dependencies.play).toHaveBeenCalledWith(target, context)
    expect(wrapper.find('.pronunciation-icon').exists()).toBe(true)
  })
})
