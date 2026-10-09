// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppButton from '@/components/app-button/app-button.vue'
import FeedbackForm from '@/features/feedback/components/feedback-form.vue'
import { ApiError } from '@/services/http/errors'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'
const dependencies = vi.hoisted(() => ({ create: vi.fn(), credential: vi.fn(), navigate: vi.fn() }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    feedback: { create: dependencies.create, getUploadCredential: dependencies.credential }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.stubGlobal('uni', { uploadFile: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())
describe('反馈草稿提交', () => {
  it('默认选中内容问题与画板一致', () => {
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    expect(useFeedbackDraftStore().draft.category).toBe('CONTENT')
    wrapper.unmount()
  })
  it('截图上传失败不创建反馈并保留附件供重试', async () => {
    const store = useFeedbackDraftStore()
    store.update({
      category: 'CONTENT',
      description: '第二句释义疑问',
      source: { scene_id: 'one' },
      screenshots: [{ path: '/one.png', mimeType: 'image/png', size: 2 }]
    })
    dependencies.credential.mockRejectedValue(new Error('offline'))
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(store.draft.screenshots).toHaveLength(1)
    expect(store.draft.description).toBe('第二句释义疑问')
    expect(dependencies.create).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('安全拦截后保留本机草稿并进入修改页', async () => {
    const store = useFeedbackDraftStore()
    store.update({
      category: 'CONTENT',
      description: '待修改的问题内容',
      source: { page_label: '首页' },
      screenshots: []
    })
    dependencies.create.mockRejectedValue(new ApiError('FEEDBACK_CONTENT_BLOCKED', 'blocked', 422))
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(store.draft.description).toBe('待修改的问题内容')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/feedback/content-blocked'
    })
    wrapper.unmount()
  })
  it('从我的页面直接提交时必须先选择相关页面或内容', async () => {
    useFeedbackDraftStore().update({ description: '相关页面按钮失效' })
    dependencies.create.mockResolvedValue({ id: 'created' })
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(dependencies.create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请选择相关页面或内容')
    wrapper.unmount()
  })
  it('成功提交后清空旧来源，避免下一个反馈继承旧场景', () => {
    const store = useFeedbackDraftStore()
    store.update({ source: { scene_id: 'old' }, description: '旧内容' })
    store.clear()
    expect(store.draft.source).toBeUndefined()
    expect(store.draft.description).toBe('')
  })
})
