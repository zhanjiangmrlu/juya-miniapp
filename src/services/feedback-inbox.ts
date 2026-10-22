import { nextTick, ref } from 'vue'

import { ApiError } from '@/services/errors'

import type {
  FeedbackDetail,
  FeedbackInboxPorts,
  FeedbackReadReceipt,
  FeedbackUnread
} from '@/shared/types/feedback'

/** 仅保存本人反馈聚合标识，不缓存回复正文
 * @param ports 当前本人会话及持久幂等写入
 */
export const createFeedbackInbox = (ports: FeedbackInboxPorts) => {
  const value = ref<FeedbackUnread>({ unread: false, count: 0 }),
    error = ref('')
  let generation = 0,
    owner: string | null = null
  /** 账号失效时立即清除红点并拒绝旧响应 */
  const clear = () => {
    generation++
    owner = null
    value.value = { unread: false, count: 0 }
    error.value = ''
  }
  /** 只读取当前账号聚合，不把列表读取当成已读 */
  const refresh = async () => {
    const expected = ports.session.userId()
    if (!expected) {
      clear()
      return
    }
    if (owner !== expected) {
      clear()
      owner = expected
    }
    const run = ++generation
    try {
      const result = await ports.session.request<FeedbackUnread>('/api/mini/v1/feedback/unread')
      if (run === generation && expected === ports.session.userId()) {
        value.value = result
        error.value = ''
      }
    } catch (reason) {
      if (run === generation && expected === ports.session.userId())
        error.value = reason instanceof Error ? reason.message : '未读状态暂未获取'
    }
  }
  /** 只确认真正渲染快照的事件水位，回执不用于强行清除更新的红点
   * @param snapshot 已赋给时间线组件的反馈内容
   * @param rendered 渲染完成后页面仍有效且仍展示同一快照
   */
  const acknowledge = async (
    snapshot: Pick<FeedbackDetail, 'id' | 'unread' | 'latest_event_id'> & {
      events: { id: number }[]
    },
    rendered: () => boolean
  ) => {
    const expected = ports.session.userId(),
      eventId = Math.max(0, ...snapshot.events.map((item) => item.id))
    await nextTick()
    if (
      !expected ||
      !snapshot.unread ||
      !eventId ||
      !rendered() ||
      expected !== ports.session.userId()
    )
      return
    const action = `feedback:read:${snapshot.id}:${eventId}`
    let recovered = false
    if (ports.operations.pending(action)) {
      try {
        recovered = Boolean(
          await ports.operations.recover<FeedbackReadReceipt>(action, { retry: false })
        )
      } catch (reason) {
        if (!(reason instanceof ApiError) || reason.code !== 'operation_unknown') throw reason
      }
    }
    if (!rendered() || expected !== ports.session.userId()) return
    if (!recovered)
      await ports.operations.run<FeedbackReadReceipt>(
        action,
        `/api/mini/v1/feedback/${encodeURIComponent(snapshot.id)}/read`,
        'PUT',
        { event_id: eventId }
      )
    if (rendered() && expected === ports.session.userId()) await refresh()
  }
  return { value, error, refresh, clear, acknowledge }
}
