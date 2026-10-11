import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { onBeforeUnmount, watch } from 'vue'

import { useSessionStore } from '@/stores/session'

/** 隔离反馈请求；clear 清除旧投影，refresh 在可见页确认新身份后重读摘要 */
export const useFeedbackRequestLifecycle = (
  clear: (identityChanged: boolean) => void,
  refresh?: () => Promise<void>
) => {
  const session = useSessionStore()
  let generation = 0
  let visible = true
  /** 使在途请求失效，identityChanged 表示注销或切账号；仅学习清理保留本人的反馈草稿 */
  const invalidate = (identityChanged = false) => {
    visible = false
    generation++
    clear(identityChanged)
  }
  onShow(() => {
    visible = true
  })
  onHide(() => invalidate())
  onUnload(() => invalidate())
  onBeforeUnmount(() => invalidate())
  watch(
    () => [session.isAuthenticated, session.profile?.juya_id, session.cleanupGeneration] as const,
    (next, previous) => {
      const identityChanged = next[0] !== previous[0] || next[1] !== previous[1]
      if (!identityChanged && next[2] === previous[2]) return
      generation++
      clear(identityChanged)
      if (visible && identityChanged && next[0] && next[1]) void refresh?.()
    },
    { flush: 'sync' }
  )
  return {
    /** 页面重新显示后允许新的本人请求 */
    activate: () => {
      visible = true
    },
    /** 开始新的展示或提交请求，旧请求不再拥有本页状态 */
    begin: () => ++generation,
    /** 捕获当前选择图片或目录请求的代次 */
    capture: () => generation,
    /** 核对请求仍属于当前可见会话，request 为发起时捕获的代次 */
    isCurrent: (request: number) => visible && request === generation
  }
}
