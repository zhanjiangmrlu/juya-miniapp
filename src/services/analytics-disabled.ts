import type { createAnalyticsService } from './analytics-service'

/** 未启用统计的构建不读取授权、不收集数据，也不初始化 SDK */
const disabled = () => undefined
export const analytics: ReturnType<typeof createAnalyticsService> = {
  available: false,
  attach: disabled,
  track: disabled,
  setConsent: disabled,
  foreground: disabled,
  background: disabled,
  setAuthenticated: disabled,
  choice: disabled,
  hasConsent: () => false
}
