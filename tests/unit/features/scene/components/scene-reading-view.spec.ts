// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SceneReadingView from '@/features/scene/components/scene-reading-view.vue'
import SceneWordGrid from '@/features/scene/components/scene-word-grid.vue'

const entries = [
  {
    entry_id: 's1',
    entry_type: 'DIALOGUE' as const,
    text: 'A medium.',
    chinese: '中杯。',
    speaker: 'Ivy',
    source_locator: 's1'
  }
]
describe('场景全文译文和直显资料', () => {
  it('无对话词卡只显示主体词汇，不显示空对话与译文入口', () => {
    const words = ['中杯', '中等的'].map((chinese, index) => ({
      ...entries[0],
      entry_id: `w${index}`,
      entry_type: 'VOCABULARY' as const,
      text: 'medium',
      chinese
    }))
    const wrapper = mount(SceneReadingView, {
      props: { entries: [], words, chunks: [], chineseVisible: true },
      global: { stubs: { SceneWordGrid: true } }
    })
    expect(wrapper.text()).toContain('重点词汇')
    expect(wrapper.findComponent(SceneWordGrid).props('entries')).toEqual(words)
    expect(wrapper.text()).not.toContain('场景对话')
    expect(wrapper.find('.dialogue-card').exists()).toBe(false)
    expect(wrapper.find('.translation-toggle').exists()).toBe(false)
    expect(wrapper.find('.full-translation').exists()).toBe(false)
  })
  it('同条目同来源不同义项的收藏pending只禁用自己的卡', () => {
    const word = {
      ...entries[0],
      entry_id: 'w1',
      entry_type: 'VOCABULARY' as const,
      source_id: 'source-1'
    }
    const wrapper = mount(SceneWordGrid, {
      props: {
        entries: [
          { ...word, sense_id: 'sense-1' },
          { ...word, sense_id: 'sense-2' }
        ],
        pendingIds: ['["w1","sense-1","source-1"]']
      },
      global: {
        stubs: { SceneWordCard: { props: ['pending'], template: '<button :disabled="pending" />' } }
      }
    })
    expect(
      wrapper.findAll('button').map((button) => button.attributes('disabled') !== undefined)
    ).toEqual([true, false])
  })
  it('默认只读英文，展开仅影响完整译文并保留词汇中文', async () => {
    const wrapper = mount(SceneReadingView, {
      props: {
        entries,
        words: [
          {
            entry_id: 'w1',
            entry_type: 'VOCABULARY',
            text: 'medium',
            chinese: '中杯',
            source_locator: 's1'
          }
        ],
        chunks: [],
        chineseVisible: false
      },
      global: { stubs: { SceneWordGrid: { template: '<div>中杯</div>' } } }
    })
    expect(wrapper.find('.full-translation').exists()).toBe(false)
    expect(wrapper.text()).toContain('中杯')
    await wrapper.find('.translation-toggle').trigger('click')
    expect(wrapper.emitted('toggleTranslation')).toHaveLength(1)
    expect(wrapper.emitted('favorite')).toBeUndefined()
    await wrapper.setProps({ chineseVisible: true })
    expect(wrapper.find('.full-translation').text()).toContain('中杯。')
    expect(wrapper.findAll('.sentence-text')).toHaveLength(1)
  })
  it('空词汇和语块隐藏标题和区块，姓名不含查词按钮', () => {
    const wrapper = mount(SceneReadingView, {
      props: { entries, words: [], chunks: [], chineseVisible: false }
    })
    expect(wrapper.text()).not.toContain('重点词汇')
    expect(wrapper.text()).not.toContain('语块')
    expect(wrapper.find('.sentence-speaker').text()).toBe('Ivy:')
    expect(wrapper.find('.sentence-speaker').attributes('role')).toBeUndefined()
  })
})
