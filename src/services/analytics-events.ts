import { CONSENT_EVENT_NAMES, CONSENT_EVENT_PROPERTIES } from '@/shared/constants/privacy'

import type {
  AnalyticsContext,
  AnalyticsEventPorts,
  CanonicalAnalyticsEvent
} from '@/shared/types/privacy'
/** 仅接收当前账号许可之后产生的事件，撤回与换号丢弃重试队列
 * @param ports 可信身份及当前许可读取和隔离事件接收边界
 */
export const createAnalyticsEvents = (ports: AnalyticsEventPorts) => {
  const queue: { context: AnalyticsContext; event: CanonicalAnalyticsEvent }[] = []
  let sending = false
  /** 快照当前许可，只接收五类成功事件及必要引用
   * @param event 事件名称
   * @param properties 已成功操作的非敏感业务引用
   * @param operationKey 成功业务操作的持久回执键
   */
  const capture = (event: string, properties: Record<string, unknown>, operationKey?: string) => {
    const context = ports.context()
    if (
      !context.enabled ||
      !context.owner ||
      !CONSENT_EVENT_NAMES.includes(event as (typeof CONSENT_EVENT_NAMES)[number])
    )
      return
    const safe: Record<string, string | number> = {}
    for (const key of CONSENT_EVENT_PROPERTIES) {
      const value = properties[key]
      if (key === 'page_path' && typeof value === 'string') {
        const route = value.split(/[?#]/)[0]?.replace(/^\/+/, '') || ''
        if (/^(?:pages|sub-packages)\/[A-Za-z0-9_/-]{1,120}$/.test(route)) safe[key] = route
      } else if (
        (key === 'content_id' || key === 'version_id') &&
        typeof value === 'string' &&
        /^[A-Za-z0-9_-]{1,128}$/.test(value)
      )
        safe[key] = value
      else if (key === 'content_type' && (value === 'scene' || value === 'listening'))
        safe[key] = value
      else if (key === 'audio_kind' && (value === 'full' || value === 'word')) safe[key] = value
      else if (key === 'favorite' && (value === 0 || value === 1)) safe[key] = value
    }
    if (queue.length >= 25) return
    queue.push({
      context: { ...context },
      event: {
        event_id: ports.key(),
        event,
        occurred_at: new Date((ports.now || Date.now)()).toISOString(),
        consent_revision: context.revision,
        properties: safe,
        ...(operationKey ? { operation_key: operationKey } : {})
      }
    })
  }
  /** 发送前重新核对身份和许可，失败保留相同事件号，不重放旧许可队列 */
  const flush = async () => {
    if (sending) return
    sending = true
    try {
      while (queue.length) {
        const item = queue[0],
          context = ports.context()
        if (
          !context.enabled ||
          context.owner !== item.context.owner ||
          context.revision !== item.context.revision
        ) {
          queue.shift()
          continue
        }
        try {
          await ports.send(item.event)
          if (queue[0] === item) queue.shift()
        } catch {
          if (queue[0] === item) return
        }
      }
    } finally {
      sending = false
    }
  }
  /** 在成功点捕获并尝试发送，统计失败不传播到业务
   * @param event 成功事件名称
   * @param properties 必要业务引用
   * @param operationKey 已确认业务回执键
   */
  const track = async (
    event: string,
    properties: Record<string, unknown>,
    operationKey?: string
  ) => {
    capture(event, properties, operationKey)
    await flush()
  }
  /** 身份或许可变化时立即清理尚未发送事件 */
  const clear = () => {
    queue.length = 0
  }
  return { capture, flush, track, clear }
}
