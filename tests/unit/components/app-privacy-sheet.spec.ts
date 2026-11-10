// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})
it.each([undefined, true, false])(
  'only explains analytics without exposing a separate switch or changing existing consent (%s)',
  async (existingConsent) => {
    vi.resetModules()
    const saved = new Map<string, unknown>()
    vi.stubGlobal('__JUYA_ANALYTICS_CONFIG__', {
      enabled: true,
      appKey: 'fixture-test',
      environment: 'test'
    })
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => saved.get(key),
      setStorageSync: (key: string, value: unknown) => saved.set(key, value),
      showModal: () => {
        throw new Error('Unexpected extra dialog')
      }
    })
    const Component = (await import('@/components/app-privacy-sheet/app-privacy-sheet.vue')).default
    const { analytics } = await import('@/services/analytics')
    if (existingConsent !== undefined) analytics.setConsent(existingConsent)
    const wrapper = mount(Component, {
      global: {
        stubs: {
          'scroll-view': { template: '<section><slot /></section>' },
          view: { template: '<div><slot /></div>' },
          text: { template: '<span><slot /></span>' }
        },
        config: {
          compilerOptions: {
            isCustomElement: (tag) => ['view', 'text', 'scroll-view', 'switch'].includes(tag)
          }
        }
      }
    })
    expect(wrapper.text()).toContain('游客可直接浏览免费内容，无需创建业务账号')
    expect(wrapper.text()).toContain('本小程序不收集手机号和微信号')
    expect(wrapper.text()).not.toContain('自愿填写')
    expect(wrapper.text()).toContain('友盟')
    expect(wrapper.find('switch').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('允许使用统计')
    expect(analytics.choice()).toBe(existingConsent)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(analytics.choice()).toBe(existingConsent)
    wrapper.unmount()
  }
)
it('does not offer a statistics switch in production', async () => {
  vi.resetModules()
  vi.stubGlobal('__JUYA_ANALYTICS_CONFIG__', {
    enabled: false,
    appKey: '',
    environment: 'disabled'
  })
  const Component = (await import('@/components/app-privacy-sheet/app-privacy-sheet.vue')).default
  const wrapper = mount(Component, {
    global: {
      stubs: {
        'scroll-view': { template: '<section><slot /></section>' },
        view: { template: '<div><slot /></div>' },
        text: { template: '<span><slot /></span>' }
      },
      config: {
        compilerOptions: {
          isCustomElement: (tag) => ['view', 'text', 'scroll-view', 'switch'].includes(tag)
        }
      }
    }
  })
  expect(wrapper.find('switch').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('友盟')
  wrapper.unmount()
})
