// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileEditor from '@/features/profile/components/profile-editor.vue'
import { useSessionStore } from '@/stores/session'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  get: vi.fn(),
  update: vi.fn(),
  credential: vi.fn(),
  upload: vi.fn(),
  selected: undefined as
    ((file: { path: string; size: number; mimeType: string }) => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => Promise<void>) => {
    dependencies.show = callback
  },
  onHide: (callback: () => void) => {
    dependencies.hide = callback
  },
  onUnload: vi.fn()
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    profile: {
      get: dependencies.get,
      update: dependencies.update,
      getAvatarCredential: dependencies.credential
    }
  })
}))
vi.mock('@/features/feedback/upload-service', () => ({ uploadWithUni: dependencies.upload }))
vi.mock('@/features/feedback/screenshot-picker', () => ({
  chooseFeedbackScreenshot: (selected: typeof dependencies.selected) => {
    dependencies.selected = selected
  }
}))
const profile = {
  juya_id: 'JU1',
  nickname: 'A昵称',
  avatar_object_key: 'avatars/a.png',
  avatar_url: 'https://media.example.test/a.png'
}
const options = {
  global: {
    stubs: {
      PersonalPage: { template: '<div><slot /></div>' },
      AppButton: {
        props: ['label'],
        emits: ['press'],
        template: `<button @click="$emit('press')">{{label}}</button>`
      }
    }
  }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.stubGlobal('uni', {
    showToast: vi.fn(),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    getStorageSync: vi.fn()
  })
  dependencies.get.mockResolvedValue(profile)
})
afterEach(() => vi.unstubAllGlobals())

describe('昵称头像编辑生命周期', () => {
  it('保存后显示本人响应的签名头像，昵称修改保留原头像键', async () => {
    dependencies.update.mockResolvedValue({
      ...profile,
      avatar_url: 'https://media.example.test/confirmed.png'
    })
    const wrapper = mount(ProfileEditor, options)
    await dependencies.show?.()
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '保存资料')!
      .trigger('click')
    await flushPromises()
    expect(dependencies.update).toHaveBeenCalledWith({
      nickname: 'A昵称',
      avatar_object_key: 'avatars/a.png'
    })
    expect(wrapper.find('.avatar-preview').attributes('src')).toBe(
      'https://media.example.test/confirmed.png'
    )
    wrapper.unmount()
  })
  it('清理账号后清空昵称及本地预览，不保留上一账号明文', async () => {
    const wrapper = mount(ProfileEditor, options)
    await dependencies.show?.()
    useSessionStore().invalidateLearningData()
    await flushPromises()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('image').exists()).toBe(false)
    wrapper.unmount()
  })
  it('凭证迟到前离页，不继续上传已选头像', async () => {
    let resolve!: (value: unknown) => void
    dependencies.credential.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const wrapper = mount(ProfileEditor, options)
    await dependencies.show?.()
    await wrapper.find('.avatar-action').trigger('click')
    dependencies.selected?.({ path: 'blob:local-avatar', size: 1, mimeType: 'image/png' })
    dependencies.hide?.()
    resolve({ max_bytes: 2, key: 'avatars/a-new.png' })
    await flushPromises()
    expect(dependencies.upload).not.toHaveBeenCalled()
    expect(wrapper.find('image').exists()).toBe(false)
    wrapper.unmount()
  })
})
