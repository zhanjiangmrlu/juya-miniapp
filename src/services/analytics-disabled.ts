import type { createAnalyticsService } from './analytics-service'

/** 未启用统计的构建不读取可信上下文、不初始化 SDK */
const disabled = () => undefined
/** 未启用构建直接丢弃事件，不产生异步业务错误 */
const track = async () => undefined
export const analytics: ReturnType<typeof createAnalyticsService> = {
  available: false,
  configure: disabled,
  attach: disabled,
  sync: disabled,
  stop: disabled,
  track,
  setConsent: disabled,
  foreground: disabled,
  background: disabled,
  setAuthenticated: disabled,
  choice: () => false,
  hasConsent: () => false,
  running: false
}
