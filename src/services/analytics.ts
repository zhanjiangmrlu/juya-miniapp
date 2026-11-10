import { createAnalyticsService } from '@/services/analytics-service'

/** 构建关闭或非微信运行时保持不可用，不在模块加载时读取任何账号或许可 */
const config =
  typeof __JUYA_ANALYTICS_CONFIG__ === 'undefined'
    ? { enabled: false, appKey: '', environment: 'disabled' as const }
    : __JUYA_ANALYTICS_CONFIG__
export const analytics = createAnalyticsService({
  config,
  native: () => (typeof wx === 'undefined' ? {} : (wx as unknown as Record<string, unknown>))
})
