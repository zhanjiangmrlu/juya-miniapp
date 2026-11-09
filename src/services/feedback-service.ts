import { onSessionExpired, operations, session } from '@/services/api'
import { createFeedbackInbox } from '@/services/feedback-inbox'

export const feedbackInbox = createFeedbackInbox({ session, operations })
const cleanups = new Set<() => void>()
/** 反馈分包加载后注册其输入清理，一级页面不加载私有编辑实现
 * @param clear 身份变化时销毁分包草稿的函数
 */
export const registerFeedbackCleanup = (clear: () => void) => {
  cleanups.add(clear)
  return () => {
    cleanups.delete(clear)
  }
}
/** 退出或过期时销毁输入，不把上一身份正文交给重新登录后的账号 */
export const clearFeedbackDrafts = () => {
  for (const clear of cleanups) clear()
  feedbackInbox.clear()
}
onSessionExpired(clearFeedbackDrafts)
