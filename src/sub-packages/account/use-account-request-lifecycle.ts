import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { onBeforeUnmount, watch } from 'vue'

import { useSessionStore } from '@/stores/session'

/** 隔离账号确认页的请求，clear 为离页或身份变化后清除本页投影的端口 */
export const useAccountRequestLifecycle = (clear: () => void) => {
  const session = useSessionStore()
  let generation = 0
  let visible = true
  /** 使当前确认、读取与导航意图失效，不取消服务端已经受理的动作 */
  const invalidate = () => {
    generation++
    visible = false
    clear()
  }
  onShow(() => {
    visible = true
  })
  onHide(invalidate)
  onUnload(invalidate)
  onBeforeUnmount(invalidate)
  watch(
    () => [session.isAuthenticated, session.profile?.juya_id, session.cleanupGeneration] as const,
    (next, previous) => {
      if (next.some((value, index) => value !== previous[index])) invalidate()
    },
    { flush: 'sync' }
  )
  return {
    /** 当前页面重新显示，后续新请求才可拥有状态 */
    activate: () => {
      visible = true
    },
    /** 开始新读取或确认，旧请求不能覆盖当前页面 */
    begin: () => ++generation,
    /** 捕获已有页面操作的代次 */
    capture: () => generation,
    /** 核对仍为当前可见账号会话，request 为动作发起代次 */
    isCurrent: (request: number) => visible && request === generation
  }
}
