// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import FeedbackDetailView from '@/features/feedback/components/feedback-detail-view.vue'
import FeedbackResolutionActions from '@/features/feedback/components/feedback-resolution-actions.vue'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  unload: undefined as (() => void) | undefined,
  get: vi.fn(),
  list: vi.fn(),
  markRead: vi.fn(),
  supplement: vi.fn(),
  resolve: vi.fn(),
  navigate: vi.fn()
}))
let session = reactive({
  isAuthenticated: true,
  cleanupGeneration: 0,
  profile: { juya_id: 'owner' }
})
vi.mock('@/stores/session', () => ({ useSessionStore: () => session }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (hook: (query: Record<string, string>) => void) => hook({ id: 'one' }),
  onShow: (hook: () => Promise<void>) => {
    dependencies.show = hook
  },
  onHide: (hook: () => void) => {
    dependencies.hide = hook
  },
  onUnload: (hook: () => void) => {
    dependencies.unload = hook
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    feedback: {
      get: dependencies.get,
      resolve: dependencies.resolve,
      supplement: dependencies.supplement
    },
    messages: { list: dependencies.list, markRead: dependencies.markRead }
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
  vi.resetAllMocks()
  session = reactive({ isAuthenticated: true, cleanupGeneration: 0, profile: { juya_id: 'owner' } })
  dependencies.get.mockResolvedValue(item)
  dependencies.list.mockResolvedValue({ items: [], has_more: false })
})

describe('反馈页面展示分支', () => {
  it('正常补充成功不取消在途消息已读且保留最新时间线', async () => {
    let finish!: (value: unknown) => void
    dependencies.list.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    dependencies.supplement.mockResolvedValue({
      ...item,
      status: 'SUPPLEMENTED',
      description: '补充后的记录'
    })
    const wrapper = mount(FeedbackDetailView, { global: { stubs: { PageHeader: true } } })
    const pendingLoad = dependencies.show?.()
    await flushPromises()
    wrapper.findComponent(AppButton).vm.$emit('press')
    await wrapper.vm.$nextTick()
    await wrapper.find('textarea').trigger('input', { detail: { value: '补充说明' } })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(dependencies.supplement).toHaveBeenCalled()
    finish({
      items: [{ id: 'message', related_type: 'FEEDBACK', related_id: 'one', read_at: null }],
      has_more: false
    })
    await pendingLoad
    expect(dependencies.markRead).toHaveBeenCalledExactlyOnceWith('message')
    expect(wrapper.text()).toContain('补充后的记录')
    wrapper.unmount()
  })
  it('正常重开结果可导航并完成并行消息已读', async () => {
    let finish!: (value: unknown) => void
    dependencies.list.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    dependencies.resolve.mockResolvedValue(item)
    const wrapper = mount(FeedbackDetailView, {
      props: { resultMode: true },
      global: { stubs: { PageHeader: true } }
    })
    const pendingLoad = dependencies.show?.()
    await flushPromises()
    wrapper
      .findComponent(FeedbackResolutionActions)
      .vm.$emit('resolve', { action: 'REOPEN', reason: '还有问题' })
    await flushPromises()
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/feedback/detail?id=one'
    })
    finish({
      items: [{ id: 'message', related_type: 'FEEDBACK', related_id: 'one', read_at: null }],
      has_more: false
    })
    await pendingLoad
    expect(dependencies.markRead).toHaveBeenCalledExactlyOnceWith('message')
    wrapper.unmount()
  })
  it('空补充校验不取消在途关联消息已读', async () => {
    let finish!: (value: unknown) => void
    dependencies.list.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(FeedbackDetailView, { global: { stubs: { PageHeader: true } } })
    const pendingLoad = dependencies.show?.()
    await flushPromises()
    wrapper.findComponent(AppButton).vm.$emit('press')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('补充说明需为 1 至 300 字')
    finish({
      items: [{ id: 'message', related_type: 'FEEDBACK', related_id: 'one', read_at: null }],
      has_more: false
    })
    await pendingLoad
    expect(dependencies.markRead).toHaveBeenCalledExactlyOnceWith('message')
    wrapper.unmount()
  })
  it.each(['hide', 'unload'] as const)('%s后迟到详情不填正文也不读取关联消息', async (leave) => {
    let finish!: (value: FeedbackItem) => void
    dependencies.get.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(FeedbackDetailView, { global: { stubs: { PageHeader: true } } })
    const request = dependencies.show?.()
    dependencies[leave]?.()
    finish(item)
    await request
    expect(wrapper.text()).not.toContain('问题描述')
    expect(dependencies.list).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('消息分页迟到后不把旧记录标为当前账号已读', async () => {
    let finish!: (value: unknown) => void
    dependencies.list.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(FeedbackDetailView, { global: { stubs: { PageHeader: true } } })
    const request = dependencies.show?.()
    await flushPromises()
    session.cleanupGeneration++
    finish({
      items: [{ id: 'message', related_type: 'FEEDBACK', related_id: 'one', read_at: null }],
      has_more: true,
      next_cursor: 'next-old-page'
    })
    await request
    expect(dependencies.markRead).not.toHaveBeenCalled()
    expect(dependencies.list).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('问题描述')
    wrapper.unmount()
  })

  it('重开结果迟到且已切换账号时不填旧记录或跳转', async () => {
    let finish!: (value: FeedbackItem) => void
    dependencies.resolve.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(FeedbackDetailView, {
      props: { resultMode: true },
      global: { stubs: { PageHeader: true } }
    })
    await dependencies.show?.()
    wrapper
      .findComponent(FeedbackResolutionActions)
      .vm.$emit('resolve', { action: 'REOPEN', reason: '还有问题' })
    session.profile.juya_id = 'other'
    finish(item)
    await flushPromises()
    expect(dependencies.navigate).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('问题描述')
    wrapper.unmount()
  })
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
