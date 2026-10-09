// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NetworkReconnectDialog from '@/components/network-reconnect-dialog/network-reconnect-dialog.vue'
import AccessNotice from '@/features/learning/components/access-notice.vue'

beforeEach(() => {
  vi.stubGlobal('uni', { getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 20 }) })
})
afterEach(() => {
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
  vi.unstubAllGlobals()
})

describe('弹窗阻止背景滚动', () => {
  it.each([NetworkReconnectDialog, AccessNotice])(
    '显示提示时锁住页面，移除后恢复原样式',
    (dialog) => {
      document.documentElement.style.overflow = 'auto'
      document.body.style.overflow = 'scroll'
      const wrapper = mount(dialog)
      try {
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.body.style.overflow).toBe('hidden')
        const gesture = new Event('touchmove', { bubbles: true, cancelable: true })
        wrapper.element.dispatchEvent(gesture)
        expect(gesture.defaultPrevented).toBe(true)
      } finally {
        wrapper.unmount()
      }
      expect(document.documentElement.style.overflow).toBe('auto')
      expect(document.body.style.overflow).toBe('scroll')
    }
  )

  it('两个提示同时存在时，关闭其中一个不会提前解除滚动锁', () => {
    const first = mount(NetworkReconnectDialog)
    const second = mount(AccessNotice)
    try {
      first.unmount()
      expect(document.documentElement.style.overflow).toBe('hidden')
    } finally {
      second.unmount()
    }
    expect(document.documentElement.style.overflow).toBe('')
  })
})
