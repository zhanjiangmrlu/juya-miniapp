import { operations, session } from '@/services/api'
import { registerFeedbackCleanup } from '@/services/feedback-service'
import { operationKey } from '@/services/platform'
import { createFeedbackDraft } from '@/sub-packages/feedback/use-feedback-draft'

import type { FeedbackOrigin } from '@/shared/types/feedback'
const drafts = new Map<string, ReturnType<typeof createFeedbackDraft>>()
let memoryOwner: string | null = null
/** 身份边界销毁本分包所有输入和迟到上传 */
const clear = () => {
  for (const draft of drafts.values()) {
    draft.lock()
    draft.discard(true)
  }
  drafts.clear()
  memoryOwner = null
}
const unregister = registerFeedbackCleanup(clear)
if (import.meta.hot) import.meta.hot.dispose(unregister)
/** 获取当前本人内存草稿，同账号重登恢复，其他账号不得沿用
 * @param feedbackId 已有反馈编号，首次提交时省略
 * @param source 首次反馈的真实入口摘要
 */
export const feedbackDraft = (feedbackId?: string, source?: FeedbackOrigin) => {
  const owner = session.userId()
  if (!owner) throw new Error('请先登录后继续反馈')
  if (memoryOwner !== owner) {
    for (const draft of drafts.values()) {
      draft.lock()
      draft.discard(true)
    }
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
