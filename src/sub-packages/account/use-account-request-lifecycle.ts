import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { onBeforeUnmount, watch } from 'vue'

import { useSessionStore } from '@/stores/session'

/** 隔离账号请求；clear 清除旧投影，refresh 在可见页确认新身份后读取本人状态 */
export const useAccountRequestLifecycle = (clear: () => void, refresh?: () => Promise<void>) => {
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
      if (!next.some((value, index) => value !== previous[index])) return
      generation++
      clear()
      const identityChanged = next[0] !== previous[0] || next[1] !== previous[1]
      if (visible && identityChanged && next[0] && next[1]) void refresh?.()
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
