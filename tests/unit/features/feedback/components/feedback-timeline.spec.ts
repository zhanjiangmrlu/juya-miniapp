// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FeedbackTimeline from '@/features/feedback/components/feedback-timeline.vue'

describe('反馈时间线标题优先级', () => {
  it('管理员回复排在首位仍标注发送方，后续用户说明按补充展示', () => {
    const wrapper = mount(FeedbackTimeline, {
      props: {
        item: {
          id: 'one',
          category: 'CONTENT',
          status: 'NEEDS_SUPPLEMENT',
          screenshots: [],
          description: '用户说明',
          reply: '管理员回复',
          created_at: '2026-10-09T09:00:00Z',
          resolved_at: '2026-10-09T08:00:00Z',
          supplements: [{ text: '补充内容', created_at: '2026-10-09T10:00:00Z' }]
        }
      }
    })
    expect(wrapper.findAll('.row-title').map((title) => title.text())).toEqual([
      '管理员回复',
      '补充说明',
      '补充说明'
    ])
    expect(wrapper.findAll('.row-badge').map((badge) => badge.text())).toEqual([
      '需补充',
      '已提交',
      '已提交'
    ])
    wrapper.unmount()
  })
})
