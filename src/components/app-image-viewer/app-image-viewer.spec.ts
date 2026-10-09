// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppImageViewer from './app-image-viewer.vue'

enableAutoUnmount(afterEach)
beforeEach(() => vi.stubGlobal('uni', {}))
afterEach(() => vi.unstubAllGlobals())

describe('公共图片查看器', () => {
  it('接受各业务的图片、标题和说明，并完整显示图片', () => {
    const wrapper = mount(AppImageViewer, {
      props: {
        imageUrl: '/original.png',
        title: '在咖啡店',
        subtitle: 'At the Coffee Shop',
        caption: '学习原图',
        dialogLabel: '查看学习原图'
      }
    })

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('查看学习原图')
    expect(wrapper.text()).toContain('在咖啡店')
    expect(wrapper.text()).toContain('At the Coffee Shop')
    expect(wrapper.text()).toContain('学习原图')
    expect(wrapper.get('image').attributes()).toMatchObject({
      src: '/original.png',
      mode: 'aspectFit'
    })
  })

  it('向调用方传递关闭和图片错误事件', async () => {
    const wrapper = mount(AppImageViewer, { props: { imageUrl: '/original.png' } })

    await wrapper.get('button').trigger('click')
    await wrapper.get('image').trigger('error')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('阻止背景手势滚动，销毁后恢复滚动', () => {
    document.body.style.overflow = 'scroll'
    const wrapper = mount(AppImageViewer, { props: { imageUrl: '/original.png' } })
    expect(document.body.style.overflow).toBe('hidden')
    for (const type of ['touchmove', 'wheel']) {
      const gesture = new Event(type, { bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(gesture)
      expect(gesture.defaultPrevented).toBe(true)
    }
    wrapper.unmount()
    expect(document.body.style.overflow).toBe('scroll')
    document.body.style.overflow = ''
  })

  it('根据微信胶囊位置将关闭按钮放在胶囊左侧', () => {
    vi.stubGlobal('uni', {
      getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 44 }),
      getMenuButtonBoundingClientRect: () => ({
        top: 52,
        bottom: 84,
        left: 280,
        right: 367,
        width: 87,
        height: 32
      })
    })
    const wrapper = mount(AppImageViewer, { props: { imageUrl: '/original.png' } })

    expect(wrapper.attributes('style')).toContain('--viewer-close-top: 47px')
    expect(wrapper.attributes('style')).toContain('--viewer-close-right: 122px')
  })
})
