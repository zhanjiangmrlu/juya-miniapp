// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FeedbackDetailView from '@/features/feedback/components/feedback-detail-view.vue'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  get: vi.fn(),
  list: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (hook: (query: Record<string, string>) => void) => hook({ id: 'one' }),
  onShow: (hook: () => Promise<void>) => {
    dependencies.show = hook
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    feedback: { get: dependencies.get },
    messages: { list: dependencies.list }
  })
}))
const item: FeedbackItem = {
  id: 'one',
  category: 'CONTENT',
  created_at: '2026-10-09T08:00:00Z',
  description: '问题描述',
  screenshots: [],
  status: 'NEEDS_SUPPLEMENT',
  reply: '请补充说明',
  title: ''
}
beforeEach(() => {
  dependencies.get.mockResolvedValue(item)
  dependencies.list.mockResolvedValue({ items: [], has_more: false })
})

describe('反馈页面展示分支', () => {
  it('处理结果提示优先于可补充状态，切换页面模式时同步更新', async () => {
    const wrapper = mount(FeedbackDetailView, {
      props: { resultMode: true },
      global: {
        stubs: { TabPageLayout: { template: '<div><slot /></div>' }, PageHeader: true }
      }
    })
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.get('.summary-note').text()).toBe('谢谢你的反馈，本次结果已记录。')
    expect(wrapper.get('.page-subtitle').text()).toBe('问题反馈 · 需要补充')
    await wrapper.setProps({ resultMode: false })
    expect(wrapper.get('.summary-note').text()).toBe('等待你补充期间不计入处理时限')
    expect(wrapper.get('.page-subtitle').text()).toBe('内容问题 · one')
    dependencies.get.mockResolvedValue({ ...item, category: 'toString', status: 'PENDING' })
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.get('.summary-note').text()).toBe('所有回复与补充保留在同一条记录中')
    expect(wrapper.get('.page-subtitle').text()).toBe('问题反馈 · one')
    wrapper.unmount()
  })
})
