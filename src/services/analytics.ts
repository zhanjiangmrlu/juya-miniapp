import { createAnalyticsEvents } from '@/services/analytics-events'

import type { AnalyticsProperties } from '@/shared/types/analytics'

// 本阶段实际传输硬关闭，隔离验收直接向工厂注入可信身份与接收器
const events = createAnalyticsEvents({
  context: () => ({ owner: null, revision: 0, enabled: false }),
  key: () => '',
  send: async () => undefined
})
/** 兼容现有业务通知端口，未授权事件在入队前丢弃
 * @param event 成功事件名称
 * @param properties 非敏感内容引用
 * @param operationKey 已确认业务回执标识
 */
const track = (event: string, properties: AnalyticsProperties = {}, operationKey?: string) => {
  void events.track(event, { ...properties }, operationKey)
}
/** 本阶段不初始化或修改第三方统计状态
 * @param _args 兼容旧调用端口的参数，当前阶段不处理
 */
const disabled = (..._args: unknown[]) => undefined
export const analytics = {
  available: false,
  attach: disabled,
  track,
  setConsent: disabled,
  foreground: disabled,
  background: events.clear,
  setAuthenticated: disabled,
  choice: () => false,
  hasConsent: () => false
}
