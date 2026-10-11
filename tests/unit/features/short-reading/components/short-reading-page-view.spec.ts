// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ShortReadingPageView from '@/features/short-reading/components/short-reading-page-view.vue'

import type { ShortReadingDetail } from '@/shared/contracts/short-reading'

const reading: ShortReadingDetail = {
  content_id: 'reading',
  content_type: 'short_reading',
  content_version: 2,
  revision_id: 'r2',
  title_en: 'A Small Favor',
  title_zh: '一个小忙',
  category: '生活短文',
  topic: '邻里',
  level: 'A2',
  access: 'OPEN',
  intro: '',
  paragraphs_en: [
    { paragraph_id: 'p1', text: 'First complete paragraph.' },
    { paragraph_id: 'p2', text: 'Last complete paragraph.' }
  ],
  translation_zh: '完整中文译文',
  whole_audio: null,
  progress: {
    content_type: 'short_reading',
    content_id: 'reading',
    content_version: 2,
    client_sequence: 0,
    started_at: null,
    last_read_at: null,
    completed_at: null,
    position: null
  }
}

describe('短文纯阅读展示', () => {
  it('精确来源只临时突出已确认段落，结束后恢复普通正文', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ShortReadingPageView, {
      global: { stubs: { 'scroll-view': { template: '<div><slot /></div>' } } },
      props: {
        reading,
        translationVisible: false,
        categorySelected: false,
        levelSelected: false,
        completing: false,
        sourceParagraphId: 'p2',
        initialPosition: { paragraph_id: 'p2', offset: 0 }
      }
    })
    await nextTick()
    expect(wrapper.findAll('.source-highlight').map((item) => item.text())).toEqual([
      'Last complete paragraph.'
    ])
    await vi.advanceTimersByTimeAsync(2500)
    expect(wrapper.find('.source-highlight').exists()).toBe(false)
    expect(wrapper.emitted('position')).toBeUndefined()
    wrapper.unmount()
    vi.useRealTimers()
  })
  it('无音频没有播放器或占位，自然段完整且无点词和收藏入口', () => {
    const wrapper = mount(ShortReadingPageView, {
      global: { stubs: { 'scroll-view': { template: '<div><slot /></div>' } } },
      props: {
        reading,
        translationVisible: false,
        categorySelected: false,
        levelSelected: false,
        completing: false
      }
    })
    expect(wrapper.findAll('.short-reading-paragraph').map((item) => item.text())).toEqual(
      reading.paragraphs_en.map((item) => item.text)
    )
    expect(wrapper.find('.whole-audio').exists()).toBe(false)
    expect(wrapper.find('.full-translation').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('收藏')
    expect(wrapper.find('.short-reading-paragraph').attributes('role')).toBeUndefined()
    wrapper.unmount()
  })

  it('独立标签与全文译文按钮发局部事件，已读完无需音频', async () => {
    const wrapper = mount(ShortReadingPageView, {
      global: { stubs: { 'scroll-view': { template: '<div><slot /></div>' } } },
      props: {
        reading,
        translationVisible: false,
        categorySelected: false,
        levelSelected: true,
        completing: false
      }
    })
    await wrapper.find('.category-tag').trigger('click')
    expect(wrapper.emitted('toggleTag')).toEqual([['category']])
    expect(wrapper.find('.level-tag').classes()).toContain('selected')
    await wrapper.find('.translation-toggle').trigger('click')
    expect(wrapper.emitted('toggleTranslation')).toHaveLength(1)
    await wrapper.setProps({ translationVisible: true })
    expect(wrapper.find('.full-translation').text()).toContain('完整中文译文')
    await wrapper.find('.complete-button').trigger('click')
    expect(wrapper.emitted('complete')).toHaveLength(1)
    expect(wrapper.emitted('favorite')).toBeUndefined()
    wrapper.unmount()
  })
})
