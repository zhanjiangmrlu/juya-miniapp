import { onBackPress } from '@dcloudio/uni-app'
import { onBeforeUnmount, type Ref, ref, watch } from 'vue'

import { backTo } from '@/services/navigation'
import { LeaveChoice } from '@/shared/enums/profile'

/** 编辑页复用三选一返回保护，微信原生离开提示作为未确认的系统返回兜底
 * @param dirty 当前是否存在未保存修改
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
  const open = ref(false)
  let allow = false
  /** 已确认离开后先解除平台提示，再退出页面 */
  const leaveNow = async () => {
    allow = true
    // #ifdef MP-WEIXIN
    if (typeof uni.disableAlertBeforeUnload === 'function')
      await new Promise<void>((resolve) =>
        uni.disableAlertBeforeUnload({ complete: () => resolve() })
      )
    // #endif
    backTo(fallback)
  }
  /** 顶部返回和取消都经过同一保护 */
  const requestBack = () => {
    if (busy.value) {
      uni.showToast({ title: '请等待当前操作完成', icon: 'none' })
      return
    }
    if (dirty.value) open.value = true
    else void leaveNow()
  }
  /** 处理明确的继续、保存和放弃选择
   * @param choice 用户在离开提示中的选择
   */
  const choose = async (choice: LeaveChoice) => {
    if (busy.value) return
    if (choice === LeaveChoice.CONTINUE) {
      open.value = false
      return
    }
    open.value = false
    if (choice === LeaveChoice.SAVE && !(await save())) return
    await leaveNow()
  }
  watch(
    dirty,
    (value) => {
      // #ifdef MP-WEIXIN
      if (value && !allow && typeof uni.enableAlertBeforeUnload === 'function')
        uni.enableAlertBeforeUnload({ message: '资料尚未保存，离开前请确认是否放弃修改' })
      else if (typeof uni.disableAlertBeforeUnload === 'function') uni.disableAlertBeforeUnload({})
      // #endif
    },
    { immediate: true }
  )
  onBackPress(() => {
    if (allow) return false
    if (dirty.value || busy.value) {
      requestBack()
      return true
    }
    return false
  })
  onBeforeUnmount(() => {
    // #ifdef MP-WEIXIN
    if (typeof uni.disableAlertBeforeUnload === 'function') uni.disableAlertBeforeUnload({})
    // #endif
  })
  return { open, requestBack, choose, leaveNow }
}
