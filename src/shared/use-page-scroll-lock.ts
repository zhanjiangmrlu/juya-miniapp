import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, inject, onBeforeUnmount, provide, ref, toValue, watch } from 'vue'

import type { PageScrollLock } from '@/shared/types/ui'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'

const scrollLockKey: InjectionKey<PageScrollLock> = Symbol('page-scroll-lock')
let browserLockCount = 0
let restoreBrowserStyle: (() => void) | undefined

/** 锁住 H5 页面滚动，最后一个弹窗关闭时恢复原有样式和滚动位置 */
const acquireBrowserLock = () => {
  // #ifdef H5
  if (typeof document !== 'undefined') {
    if (browserLockCount++ === 0) {
      const snapshots = [document.documentElement, document.body].map((element) => ({
        element,
        overflow: element.style.overflow,
        overscroll: element.style.overscrollBehavior
      }))
      for (const { element } of snapshots) {
        element.style.overflow = 'hidden'
        element.style.overscrollBehavior = 'none'
      }
      restoreBrowserStyle = () => {
        for (const { element, overflow, overscroll } of snapshots) {
          element.style.overflow = overflow
          element.style.overscrollBehavior = overscroll
        }
      }
    }
    let released = false
    return () => {
      if (released) return
      released = true
      if (--browserLockCount === 0) {
        restoreBrowserStyle?.()
        restoreBrowserStyle = undefined
      }
    }
  }
  // #endif
  return () => {}
}

/** 在路由页提供滚动锁，pageStyle 必须绑定到页面首节点 page-meta */
export const usePageScrollLock = () => {
  const count = ref(0)
  const visible = ref(true)
  const scrollLocked = computed(() => visible.value && count.value > 0)
  const pageStyle = computed(() => (scrollLocked.value ? 'overflow: hidden;' : ''))
  let releaseBrowser: (() => void) | undefined
  /** 释放本页持有的 H5 滚动锁 */
  const release = () => {
    releaseBrowser?.()
    releaseBrowser = undefined
  }
  /** 同步页面滚动状态，locked 表示本页是否存在可见弹窗 */
  const syncBrowser = (locked: boolean) => {
    release()
    if (locked) releaseBrowser = acquireBrowserLock()
  }
  /** 为一个弹窗申请锁，返回可重复调用的释放操作 */
  const acquire = () => {
    count.value++
    let released = false
    return () => {
      if (released) return
      released = true
      count.value--
    }
  }
  /** 页面重新显示时恢复仍在展示的弹窗滚动锁 */
  const show = () => {
    visible.value = true
  }
  /** 页面离开时恢复滚动，不把旧页面的锁带到新页面 */
  const hide = () => {
    visible.value = false
  }

  provide(scrollLockKey, { acquire, pageStyle, scrollLocked })
  watch(scrollLocked, syncBrowser, { flush: 'sync' })
  onShow(show)
  onHide(hide)
  onUnload(hide)
  onBeforeUnmount(release)
  return { acquire, pageStyle, scrollLocked }
}

/** 随弹窗显示申请滚动锁，visible 为弹窗是否展示的响应式状态 */
export const useModalScrollLock = (visible: MaybeRefOrGetter<boolean> = true) => {
  const page = inject(scrollLockKey, undefined)
  let release: (() => void) | undefined
  /** 关闭或销毁弹窗时释放其滚动锁 */
  const unlock = () => {
    release?.()
    release = undefined
  }
  /** 更新弹窗锁定状态，shown 表示当前弹窗是否显示 */
  const sync = (shown: boolean) => {
    unlock()
    if (shown) release = page?.acquire() ?? acquireBrowserLock()
  }
  watch(() => toValue(visible), sync, { immediate: true, flush: 'sync' })
  onBeforeUnmount(unlock)
}
