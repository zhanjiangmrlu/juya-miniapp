// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnalyticsSettings from '@/features/account/components/analytics-settings.vue'

const dependencies = vi.hoisted(() => ({
  state: 'denied',
  available: true,
  listener: undefined as (() => void) | undefined,
  setConsent: vi.fn(),
  prompt: vi.fn(),
  unsubscribe: vi.fn()
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({
    getConsent: () => dependencies.state,
    isAvailable: () => dependencies.available,
    setConsent: dependencies.setConsent,
    subscribe: (listener: () => void) => {
      dependencies.listener = listener
      return dependencies.unsubscribe
    }
  }),
  requestAnalyticsConsent: dependencies.prompt
}))
beforeEach(() => {
  vi.clearAllMocks()
  dependencies.state = 'denied'
  dependencies.available = true
})
describe('统计设置开关', () => {
  it('主动开启先展示用途说明，不把原生开关变化当作同意', async () => {
    const wrapper = mount(AnalyticsSettings)
    wrapper
      .get('switch')
      .element.dispatchEvent(new CustomEvent('change', { detail: { value: true } }))
    await flushPromises()
    expect(dependencies.prompt).toHaveBeenCalledOnce()
    expect(dependencies.setConsent).not.toHaveBeenCalled()
    expect(wrapper.get('switch').attributes('checked')).not.toBe('true')
    dependencies.state = 'granted'
    dependencies.listener?.()
    await flushPromises()
    expect(wrapper.get('switch').attributes('checked')).toBe('true')
    wrapper.unmount()
    expect(dependencies.unsubscribe).toHaveBeenCalledOnce()
  })
  it('关闭立即提交撤回，配置不完整时明确显示未启用', async () => {
    dependencies.state = 'granted'
    const wrapper = mount(AnalyticsSettings)
    wrapper
      .get('switch')
      .element.dispatchEvent(new CustomEvent('change', { detail: { value: false } }))
    expect(dependencies.setConsent).toHaveBeenCalledWith(false)
    wrapper.unmount()
    dependencies.available = false
    const disabled = mount(AnalyticsSettings)
    expect(disabled.text()).toContain('当前版本未启用统计')
    expect(disabled.get('switch').attributes('disabled')).toBeDefined()
    disabled.unmount()
  })
})
