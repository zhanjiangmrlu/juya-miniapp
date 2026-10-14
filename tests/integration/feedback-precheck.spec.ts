// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppButton from '@/components/app-button/app-button.vue'
import FeedbackForm from '@/features/feedback/components/feedback-form.vue'
import { createFeedbackService } from '@/features/feedback/feedback-service'
import { submitSupplement } from '@/features/feedback/supplement-submit'
import { MockTransport } from '@/services/mock/mock-transport'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'

import type { FeedbackItem } from '@/shared/contracts/feedback'
import type { FeedbackService } from '@/shared/types/feedback'

import { createIntegrationClient } from './mock-client'

let service: FeedbackService
const navigation = vi.hoisted(() => vi.fn())
vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn(), onHide: vi.fn(), onUnload: vi.fn() }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: navigation }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    feedback: service,
    catalog: { getCatalog: async () => ({ items: [] }) }
  })
}))
beforeEach(() => {
  setActivePinia(createPinia())
  service = createFeedbackService(createIntegrationClient())
  vi.stubGlobal('uni', { uploadFile: vi.fn() })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('反馈前置检查的共享请求层 Mock 流程', () => {
  it('创建前拦截时上传凭证与反馈POST均不进入transport，修改后按既有接口创建', async () => {
    const transport = vi.spyOn(MockTransport.prototype, 'request')
    const store = useFeedbackDraftStore()
    store.update({
      category: 'CONTENT',
      description: '微信号：Abc_123',
      source: { page_label: '首页' },
      screenshots: [{ path: '/one.png', mimeType: 'image/png', size: 2 }]
    })
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(transport).not.toHaveBeenCalled()
    expect(uni.uploadFile).not.toHaveBeenCalled()
    expect(store.draft.screenshots[0]?.path).toBe('/one.png')
    await wrapper.find('textarea').trigger('input', { detail: { value: ' 第二句无法播放 ' } })
    store.update({ screenshots: [] })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      url: 'http://127.0.0.1:8000/api/v1/feedback',
      body: {
        category: 'CONTENT',
        description: '第二句无法播放',
        screenshots: [],
        source: { page_label: '首页' }
      }
    })
    expect(store.draft.description).toBe('')
    wrapper.unmount()
  })

  it('补充前拦截时没有任何HTTP请求，普通补充仍发送规范化正文和原记录标识', async () => {
    const transport = vi.spyOn(MockTransport.prototype, 'request')
    const item = { id: 'feedback-one', screenshots: [] } as unknown as FeedbackItem
    const image = { path: '/one.png', mimeType: 'image/png', size: 2 }
    await expect(submitSupplement(service, item, '请转账', image)).rejects.toMatchObject({
      code: 'FEEDBACK_CONTENT_BLOCKED'
    })
    expect(transport).not.toHaveBeenCalled()
    expect(uni.uploadFile).not.toHaveBeenCalled()
    const response = await submitSupplement(service, item, ' 第三句无法播放 ')
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      url: 'http://127.0.0.1:8000/api/v1/feedback/feedback-one/supplements',
      body: { text: '第三句无法播放', screenshots: [] }
    })
    expect(response.supplements?.[0]?.text).toBe('第三句无法播放')
  })
})
