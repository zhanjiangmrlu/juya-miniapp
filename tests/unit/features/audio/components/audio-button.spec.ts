// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import pauseGreen from '@/features/audio/assets/pause-green.svg'
import pauseLarge from '@/features/audio/assets/pause-large.svg'
import pauseWhite from '@/features/audio/assets/pause-white.svg'
import playGreen from '@/features/audio/assets/play-green.svg'
import playLarge from '@/features/audio/assets/play-large.svg'
import playWhite from '@/features/audio/assets/play-white.svg'
import { getAudioTargetKey } from '@/features/audio/audio-machine'
import AudioButton from '@/features/audio/components/audio-button.vue'

import type { AudioButtonVariant, AudioStatus } from '@/shared/enums/audio'

const target = { target_id: 'word-1', version_id: 'v1', target_type: 'word' }

describe('音频按钮展示与事件', () => {
  it.each(['future', 'toString', '__proto__'])(
    '未识别按钮样式 %s 保留默认图标',
    async (variant) => {
      const wrapper = mount(AudioButton, {
        props: { target, status: 'IDLE', variant: variant as AudioButtonVariant }
      })
      expect(wrapper.get('.play-icon').attributes('src')).toBe(playGreen)
      await wrapper.setProps({ selected: true })
      expect(wrapper.get('.play-icon').attributes('src')).toBe(playWhite)
      await wrapper.setProps({ currentKey: getAudioTargetKey(target), status: 'PLAYING' })
      expect(wrapper.get('.pause-bar').attributes('src')).toBe(pauseWhite)
      wrapper.unmount()
    }
  )
  it('未识别播放状态仍使用调用方标签', () => {
    const wrapper = mount(AudioButton, {
      props: {
        target,
        currentKey: getAudioTargetKey(target),
        status: 'toString' as AudioStatus,
        label: '自定义播放'
      }
    })
    expect(wrapper.get('button').attributes('aria-label')).toBe('自定义播放')
    wrapper.unmount()
  })
  it.each([
    ['large', false, playLarge],
    ['large', true, playLarge],
    ['inline', false, playGreen],
    ['inline', true, playGreen],
    ['pill', false, playWhite],
    ['pill', true, playWhite],
    ['compact', false, playGreen],
    ['compact', true, playWhite]
  ] as const)('%s 按钮选中=%s 使用原有播放图标', (variant, selected, asset) => {
    const wrapper = mount(AudioButton, { props: { target, status: 'IDLE', variant, selected } })
    expect(wrapper.get('.play-icon').attributes('src')).toBe(asset)
    wrapper.unmount()
  })

  it.each([
    ['large', pauseLarge],
    ['inline', pauseGreen],
    ['pill', pauseWhite],
    ['compact', pauseWhite]
  ] as const)('%s 当前音频播放时使用原有暂停图标', (variant, asset) => {
    const wrapper = mount(AudioButton, {
      props: { target, variant, status: 'PLAYING', currentKey: getAudioTargetKey(target) }
    })
    expect(wrapper.findAll('.pause-bar')).toHaveLength(2)
    expect(wrapper.get('.pause-bar').attributes('src')).toBe(asset)
    wrapper.unmount()
  })

  it.each([
    ['LOADING', '加载中', true],
    ['PLAYING', '暂停', false],
    ['PAUSED', '继续', false],
    ['FAILED', '重试', false],
    ['IDLE', '自定义播放', false]
  ] as const)('当前音频 %s 状态同步文案与禁用状态', async (status, label, disabled) => {
    const wrapper = mount(AudioButton, {
      props: { target, label: '自定义播放', status, currentKey: getAudioTargetKey(target) }
    })
    expect(wrapper.get('button').attributes('aria-label')).toBe(label)
    expect((wrapper.get('button').element as HTMLButtonElement).disabled).toBe(disabled)
    await wrapper.setProps({ currentKey: 'another-target' })
    expect(wrapper.get('button').attributes('aria-label')).toBe('自定义播放')
    expect((wrapper.get('button').element as HTMLButtonElement).disabled).toBe(false)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('play')).toEqual([[target]])
    wrapper.unmount()
  })

  it('行内播放提示随属性变化，暂停状态仍显示播放原音', async () => {
    const wrapper = mount(AudioButton, {
      props: {
        target,
        status: 'PLAYING' as AudioStatus,
        variant: 'inline' as AudioButtonVariant,
        currentKey: getAudioTargetKey(target)
      }
    })
    expect(wrapper.get('.audio-label').text()).toBe('暂停原音')
    await wrapper.setProps({ status: 'PAUSED' })
    expect(wrapper.get('.audio-label').text()).toBe('播放原音')
    expect(wrapper.get('.play-icon').attributes('src')).toBe(playGreen)
    wrapper.unmount()
  })
})
