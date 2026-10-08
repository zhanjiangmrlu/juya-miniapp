// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file -- 验证页面与嵌入弹窗之间的父子注入关系 */
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { useModalScrollLock, usePageScrollLock } from './use-page-scroll-lock'

const hooks = vi.hoisted(() => ({
  show: [] as (() => void)[],
  hide: [] as (() => void)[],
  unload: [] as (() => void)[]
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => hooks.show.push(callback),
  onHide: (callback: () => void) => hooks.hide.push(callback),
  onUnload: (callback: () => void) => hooks.unload.push(callback)
}))
beforeEach(() => {
  hooks.show.length = 0
  hooks.hide.length = 0
  hooks.unload.length = 0
})
afterEach(() => {
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
})

describe('页面滚动锁生命周期', () => {
  it.each(['hide', 'unload'] as const)('%s 时解除页面锁，返回后仍显示的弹窗重新锁定', (leave) => {
    const dialogVisible = ref(true)
    const Modal = defineComponent({
      setup() {
        useModalScrollLock(dialogVisible)
        return () => h('div')
      }
    })
    let page!: ReturnType<typeof usePageScrollLock>
    const wrapper = mount(
      defineComponent({
        setup() {
          page = usePageScrollLock()
          return () => h(Modal)
        }
      })
    )
    try {
      expect(page.pageStyle.value).toBe('overflow: hidden;')
      expect(document.documentElement.style.overflow).toBe('hidden')
      hooks[leave].forEach((callback) => callback())
      expect(page.pageStyle.value).toBe('')
      expect(document.documentElement.style.overflow).toBe('')
      hooks.show.forEach((callback) => callback())
      expect(page.pageStyle.value).toBe('overflow: hidden;')
      dialogVisible.value = false
      expect(page.pageStyle.value).toBe('')
      expect(document.documentElement.style.overflow).toBe('')
    } finally {
      wrapper.unmount()
    }
  })

  it('嵌入兼容页面时共用外层锁，只有外层页面负责 page-meta', () => {
    let outer!: ReturnType<typeof usePageScrollLock>
    let inner!: ReturnType<typeof usePageScrollLock>
    const Child = defineComponent({
      setup() {
        inner = usePageScrollLock()
        useModalScrollLock()
        return () => h('div')
      }
    })
    const wrapper = mount(
      defineComponent({
        setup() {
          outer = usePageScrollLock()
          return () => h(Child)
        }
      })
    )
    try {
      expect(outer.ownsScrollLock).toBe(true)
      expect(inner.ownsScrollLock).toBe(false)
      expect(outer.pageStyle.value).toBe('overflow: hidden;')
    } finally {
      wrapper.unmount()
    }
    expect(document.documentElement.style.overflow).toBe('')
  })
})
