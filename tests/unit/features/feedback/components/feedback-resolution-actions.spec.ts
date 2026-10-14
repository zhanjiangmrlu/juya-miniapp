// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FeedbackResolutionActions from '@/features/feedback/components/feedback-resolution-actions.vue'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const item: FeedbackItem = {
  id: 'feedback-one',
  category: 'CONTENT',
  description: '第二句无法播放',
  screenshots: [],
  created_at: '2026-10-10T08:00:00Z',
  resolved_at: '2026-10-13T08:00:00Z',
  status: 'RESOLVED',
  reopen_count: 0
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-14T08:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('反馈重开既有原因校验', () => {
  it('合法长度含URL的原因保持既有重开动作，不继承创建与补充的敏感政策', async () => {
    const wrapper = mount(FeedbackResolutionActions, { props: { item } })
    await wrapper.find('.reopen-button').trigger('click')
    const reason = ' 请核对 HTTPS://example.invalid 的第二句 '
    await wrapper.find('textarea').trigger('input', { detail: { value: reason } })
    await wrapper.find('.reopen-button').trigger('click')
    expect(wrapper.emitted('resolve')).toEqual([
      [{ action: 'REOPEN', reason: '请核对 HTTPS://example.invalid 的第二句' }]
    ])
    expect(wrapper.find('.form-error').exists()).toBe(false)
    expect(wrapper.find('textarea').element.value).toBe(reason)
    wrapper.unmount()
  })

  it.each([1, 300])('重开原因保留去首尾空白后的%d字合法边界', async (length) => {
    const wrapper = mount(FeedbackResolutionActions, { props: { item } })
    await wrapper.find('.reopen-button').trigger('click')
    await wrapper
      .find('textarea')
      .trigger('input', { detail: { value: ` ${'句'.repeat(length)} ` } })
    await wrapper.find('.reopen-button').trigger('click')
    expect(wrapper.emitted('resolve')).toEqual([
      [{ action: 'REOPEN', reason: '句'.repeat(length) }]
    ])
    wrapper.unmount()
  })

  it.each(['   ', '句'.repeat(301)])('非法长度不发送，保留输入且修改后可继续', async (reason) => {
    const wrapper = mount(FeedbackResolutionActions, { props: { item } })
    await wrapper.find('.reopen-button').trigger('click')
    await wrapper.find('textarea').trigger('input', { detail: { value: reason } })
    await wrapper.find('.reopen-button').trigger('click')
    expect(wrapper.emitted('resolve')).toBeUndefined()
    expect(wrapper.find('.form-error').text()).toBe('请填写 1 至 300 字的重开原因')
    expect(wrapper.find('textarea').element.value).toBe(reason)
    await wrapper.find('textarea').trigger('input', { detail: { value: ' 第二句仍无法播放 ' } })
    await wrapper.find('.reopen-button').trigger('click')
    expect(wrapper.emitted('resolve')).toEqual([[{ action: 'REOPEN', reason: '第二句仍无法播放' }]])
    expect(wrapper.find('.form-error').exists()).toBe(false)
    wrapper.unmount()
  })
})
