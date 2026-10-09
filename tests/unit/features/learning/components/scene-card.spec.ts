// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SceneCard from '@/features/learning/components/scene-card.vue'

import type { SceneCardViewModel } from '@/shared/types/learning'

const scene: SceneCardViewModel = {
  accessLabel: '开放学习场景',
  canOpen: true,
  chineseTitle: '问路',
  description: '练习问路',
  entryUrl: '/sub-packages/scene/detail?sceneId=one',
  progress: 0,
  sceneId: 'one',
  series: '日常',
  title: 'Directions'
}

describe('场景学习进度展示', () => {
  it.each([
    [0, '可学习 · 已开通', false],
    [1, '学习中 · 1%', true],
    [99, '学习中 · 99%', true],
    [100, '已完成 · 可复习', false]
  ] as const)('进度 %s 的文案和进度条保持一致', async (progress, label, bar) => {
    const wrapper = mount(SceneCard, { props: { scene: { ...scene, progress } } })
    expect(wrapper.get('.status').text()).toBe(label)
    expect(wrapper.find('.progress').exists()).toBe(bar)
    await wrapper.setProps({ scene: { ...scene, canOpen: false } })
    expect(wrapper.find('.status').exists()).toBe(false)
    expect(wrapper.get('.locked-label').text()).toBe('当前未开通')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([{ ...scene, canOpen: false }])
    wrapper.unmount()
  })
})
