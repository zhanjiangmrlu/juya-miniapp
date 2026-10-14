// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppButton from '@/components/app-button/app-button.vue'
import FeedbackForm from '@/features/feedback/components/feedback-form.vue'
import { ApiError } from '@/services/http/errors'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'
import { useSessionStore } from '@/stores/session'

import type { UserProfile } from '@/shared/contracts/profile'
const dependencies = vi.hoisted(() => ({
  create: vi.fn(),
  catalog: vi.fn(),
  show: undefined as (() => Promise<void>) | undefined,
  credential: vi.fn(),
  navigate: vi.fn(),
  hide: undefined as (() => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (hook: () => Promise<void>) => {
    dependencies.show = hook
  },
  onHide: (hook: () => void) => {
    dependencies.hide = hook
  },
  onUnload: vi.fn()
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    catalog: { getCatalog: dependencies.catalog },
    feedback: { create: dependencies.create, getUploadCredential: dependencies.credential }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.stubGlobal('uni', { uploadFile: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())
describe('反馈草稿提交', () => {
  it('前置拦截先于截图上传和创建，M43保留完整草稿并允许修改后重试', async () => {
    const store = useFeedbackDraftStore()
    const draft = {
      category: 'CONTENT',
      description: '微信号：Abc_123',
      source: { scene_id: 'one', source_locator: 'sentence-two' },
      screenshots: [{ path: '/one.png', mimeType: 'image/png', size: 2 }]
    }
    store.update(draft)
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(dependencies.credential).not.toHaveBeenCalled()
    expect(uni.uploadFile).not.toHaveBeenCalled()
    expect(dependencies.create).not.toHaveBeenCalled()
    expect(dependencies.navigate).toHaveBeenCalledExactlyOnceWith({
      type: 'redirectTo',
      url: '/sub-packages/feedback/content-blocked'
    })
    expect(store.draft).toEqual(draft)
    wrapper.unmount()

    const blocked = mount(FeedbackForm, {
      props: { blocked: true },
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    expect(blocked.text()).toContain('内容未通过检查')
    expect(blocked.find('textarea').element.value).toBe(draft.description)
    await blocked.find('textarea').trigger('input', { detail: { value: ' 第二句无法播放 ' } })
    store.update({ screenshots: [] })
    dependencies.create.mockResolvedValue({ id: 'new-feedback' })
    blocked.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(dependencies.create).toHaveBeenCalledExactlyOnceWith({
      category: 'CONTENT',
      description: '第二句无法播放',
      screenshots: [],
      source: draft.source
    })
    expect(store.draft.description).toBe('')
    blocked.unmount()
  })
  it('返回同一表单重新读取内容系列且正常提交成功', async () => {
    dependencies.catalog.mockResolvedValue({
      items: [{ scene_id: 'one', title: 'Series One', series: 'one' }]
    })
    const wrapper = mount(FeedbackForm, {
      global: {
        stubs: {
          picker: {
            props: ['range'],
            template: '<div class="source-picker">{{ JSON.stringify(range) }}<slot /></div>'
          }
        }
      }
    })
    await flushPromises()
    expect(wrapper.find('.source-picker').text()).toContain('Series One')
    dependencies.hide?.()
    await wrapper.vm.$nextTick()
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.find('.source-picker').text()).toContain('Series One')
    useFeedbackDraftStore().update({
      category: 'CONTENT',
      description: '返回后的说明',
      source: { scene_id: 'one' }
    })
    dependencies.create.mockResolvedValue({ id: 'new-feedback' })
    wrapper.findComponent(AppButton).vm.$emit('press')
    await flushPromises()
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/feedback/detail?id=new-feedback'
    })
    expect(useFeedbackDraftStore().draft.description).toBe('')
    wrapper.unmount()
  })
  it('上传凭证迟到且页面已隐藏时不再传图或创建反馈', async () => {
    const store = useFeedbackDraftStore()
    store.update({
      category: 'CONTENT',
      description: '显示问题说明',
      source: { page_label: '首页' },
      screenshots: [{ path: '/one.png', mimeType: 'image/png', size: 2 }]
    })
    let finish!: (value: unknown) => void
    dependencies.credential.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    dependencies.hide?.()
    finish({
      content_type: 'image/png',
      host: 'https://upload.test',
      fields: {},
      key: 'old-key',
      max_bytes: 100
    })
    await flushPromises()
    expect(uni.uploadFile).not.toHaveBeenCalled()
    expect(dependencies.create).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('创建成功迟到不能清空新账号草稿或跳转旧详情', async () => {
    const store = useFeedbackDraftStore()
    store.update({ category: 'CONTENT', description: '原账号描述', source: { page_label: '首页' } })
    let finish!: (value: unknown) => void
    dependencies.create.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done
        })
    )
    const wrapper = mount(FeedbackForm, {
      global: { stubs: { picker: { template: '<div><slot /></div>' } } }
    })
    wrapper.findComponent(AppButton).vm.$emit('press')
    useSessionStore().profile = { juya_id: 'new-account' } as UserProfile
    store.update({ description: '新账号草稿' })
    finish({ id: 'old-feedback' })
    await flushPromises()
    expect(store.draft.description).toBe('新账号草稿')
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
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
