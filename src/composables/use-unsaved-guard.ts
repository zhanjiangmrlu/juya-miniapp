import { onBackPress } from '@dcloudio/uni-app'
import { computed, nextTick, onBeforeUnmount, type Ref, ref, watch } from 'vue'

import { backTo } from '@/services/navigation'
import { LeaveChoice } from '@/shared/enums/profile'

/** 编辑页顶部、取消和系统返回共用三种明确选择
 * @param dirty 当前未保存资料
 * @param busy 当前上传或保存是否仍在进行
 * @param save 真实保存函数
 * @param fallback 没有来源页面时的安全返回位置
 */
export const useUnsavedGuard = (
  dirty: Ref<boolean>,
  busy: Ref<boolean>,
  save: () => Promise<boolean>,
  fallback: string
) => {
  const open = ref(false),
    nativeShow = ref(false)
  let nativeRuntime = false
  // #ifdef MP-WEIXIN
  nativeRuntime = true
  // #endif
  const nativeCapable =
    nativeRuntime && typeof uni.canIUse === 'function' && uni.canIUse('page-container')
  const canEdit = computed(() => !nativeRuntime || nativeCapable)
  let allow = false,
    alive = true,
    visible = false,
    nativeClosing = false,
    leaving = false
  let completeClose: ((closed: boolean) => void) | null = null
  /** 仅在有未保存资料或正在操作时拦截原生返回 */
  const arm = () => {
    nativeShow.value = nativeCapable && alive && !allow && (dirty.value || busy.value)
    if (nativeShow.value) visible = true
  }
  /** 已确认后等待原生容器关闭，避免一次返回只关容器或重复返回页面 */
  const leaveNow = async () => {
    if (leaving || allow || !alive) return
    leaving = true
    allow = true
    open.value = false
    if (nativeCapable && (visible || nativeClosing || nativeShow.value)) {
      const closed = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          completeClose = null
          resolve(false)
        }, 3000)
        completeClose = (value) => {
          clearTimeout(timer)
          completeClose = null
          resolve(value)
        }
        nativeShow.value = false
      })
      if (!closed || !alive) {
        allow = false
        leaving = false
        if (alive) {
          arm()
          uni.showToast({ title: '页面返回未完成，请重试', icon: 'none' })
        }
        return
      }
    }
    if (alive) backTo(fallback)
  }
  /** 顶部返回和取消复用同一份保护，不中断正在提交的操作 */
  const requestBack = () => {
    if (busy.value) {
      uni.showToast({ title: '请等待当前操作完成', icon: 'none' })
      return
    }
    if (dirty.value) open.value = true
    else void leaveNow()
  }
  /** 原生容器开始关闭时同步受控属性，随后可以再次显示 */
  const nativeBeforeLeave = () => {
    nativeClosing = true
    nativeShow.value = false
  }
  /** 系统返回只消费原生容器，再显示三选一并重新拦截后续返回 */
  const nativeAfterLeave = async () => {
    visible = false
    nativeClosing = false
    if (allow) {
      completeClose?.(true)
      return
    }
    if (!alive || (!dirty.value && !busy.value)) return
    requestBack()
    await nextTick()
    arm()
  }
  /** 用户明确选择继续、保存或放弃后决定是否返回
   * @param choice 三选一确认中的实际选择
   */
  const choose = async (choice: LeaveChoice) => {
    if (busy.value || leaving) return
    open.value = false
    if (choice === LeaveChoice.CONTINUE) {
      arm()
      return
    }
    if (choice === LeaveChoice.SAVE && !(await save())) {
      arm()
      return
    }
    await leaveNow()
  }
  watch([dirty, busy], arm, { immediate: true })
  onBackPress(() => {
    if (allow) return false
    if (dirty.value || busy.value) {
      requestBack()
      return true
    }
    return false
  })
  onBeforeUnmount(() => {
    alive = false
    completeClose?.(false)
  })
  return {
    open,
    requestBack,
    choose,
    leaveNow,
    canEdit,
    nativeShow,
    nativeBeforeLeave,
    nativeAfterLeave
  }
}
