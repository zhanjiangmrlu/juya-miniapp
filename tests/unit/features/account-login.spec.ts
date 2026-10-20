// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

const { login, openTarget } = vi.hoisted(() => ({ login: vi.fn(), openTarget: vi.fn() }))
vi.mock('@dcloudio/uni-app', () => ({ onLoad: vi.fn() }))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ login }) }))
vi.mock('@/services/navigation', () => ({ openTarget }))
import LoginPage from '@/pages/login/index.vue'

/** 挂载真实登录操作，布局及说明弹窗独立隔离 */
const page = () =>
  mount(LoginPage, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot /></div>' },
        Checkbox: { template: '<input type="checkbox" />' },
        CheckboxGroup: { template: '<div class="checkbox-group"><slot /></div>' },
        AppPrivacySheet: {
          template: '<button class="close-privacy" @click="$emit(\'close\')">关闭</button>'
        }
      }
    }
  })
beforeEach(() => {
  vi.clearAllMocks()
  login.mockResolvedValue(undefined)
})
it('keeps WebP when it loads and falls back once to PNG when decoding fails', async () => {
  const wrapper = page()
  const background = wrapper.get('.login-botanical')
  expect(background.attributes('src')).toMatch(/\.webp$/)
  expect(background.attributes('webp')).toBe('true')
  await background.trigger('load')
  expect(background.attributes('src')).toMatch(/\.webp$/)
  await background.trigger('error')
  expect(background.attributes('src')).toMatch(/\.png$/)
  expect(background.attributes('webp')).toBe('false')
  const fallback = background.attributes('src')
  await background.trigger('error')
  expect(background.attributes('src')).toBe(fallback)
  wrapper.unmount()
})
it('requires explicit consent before any account login and keeps the agreed state after reading privacy', async () => {
  const wrapper = page()
  await wrapper.get('button.primary').trigger('click')
  expect(login).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('请先阅读并同意隐私说明')
  await wrapper.get('.checkbox-group').trigger('change', { detail: { value: ['agree'] } })
  await wrapper.get('.privacy-link').trigger('click')
  await wrapper.get('.close-privacy').trigger('click')
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
  expect(login).toHaveBeenCalledExactlyOnceWith(true)
  expect(openTarget).toHaveBeenCalledOnce()
  wrapper.unmount()
})
it('keeps the login screen and a retry message when identity login fails', async () => {
  login.mockRejectedValue(new Error('微信登录暂未成功'))
  const wrapper = page()
  await wrapper.get('.checkbox-group').trigger('change', { detail: { value: ['agree'] } })
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('微信登录暂未成功')
  expect(openTarget).not.toHaveBeenCalled()
  wrapper.unmount()
})
