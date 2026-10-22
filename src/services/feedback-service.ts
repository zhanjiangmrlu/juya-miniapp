import { createFeedbackDraft } from '@/composables/use-feedback-draft'
import { onSessionExpired, operations, session } from '@/services/api'
import { createFeedbackInbox } from '@/services/feedback-inbox'
import { operationKey } from '@/services/platform'

import type { FeedbackOrigin } from '@/shared/types/feedback'

const drafts = new Map<string, ReturnType<typeof createFeedbackDraft>>()
let memoryOwner: string | null = null
export const feedbackInbox = createFeedbackInbox({ session, operations })
onSessionExpired(() => {
  feedbackInbox.clear()
  for (const draft of drafts.values()) draft.lock()
})
/** 获取当前本人内存草稿，同账号重登恢复，其他账号不得沿用
 * @param feedbackId 已有反馈编号，首次提交时省略
 * @param source 首次反馈的真实入口摘要
 */
export const feedbackDraft = (feedbackId?: string, source?: FeedbackOrigin) => {
  const owner = session.userId()
  if (!owner) throw new Error('请先登录后继续反馈')
  if (memoryOwner !== owner) {
    for (const draft of drafts.values()) draft.discard(true)
    drafts.clear()
    memoryOwner = owner
  }
  const action = feedbackId ? `feedback:reply:${feedbackId}` : 'feedback:create'
  let draft = drafts.get(action)
  if (!draft) {
    draft = createFeedbackDraft({
      session,
      operations,
      owner,
      action,
      feedbackId,
      source,
      key: operationKey
    })
    drafts.set(action, draft)
  }
  return draft
}
/** 明确退出账号后销毁内存草稿，过期重新登录不调用此清理 */
export const clearFeedbackDrafts = () => {
  for (const draft of drafts.values()) draft.discard(true)
  drafts.clear()
  memoryOwner = null
  feedbackInbox.clear()
}
