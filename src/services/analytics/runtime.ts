// #ifdef MP-WEIXIN
// eslint-disable-next-line import/no-unresolved
import sdkFactory from 'virtual:juya-umeng-sdk'

// #endif
import { createAnalyticsService } from '@/services/analytics/analytics-service'
import { createUmengDriver } from '@/services/analytics/umeng-driver'
import { ANALYTICS_NOTICE } from '@/shared/constants/analytics'

import type { AnalyticsDriver, AnalyticsNative } from '@/shared/types/analytics'

declare const wx: AnalyticsNative
let analytics: ReturnType<typeof createAnalyticsService> | undefined
let prompting = false

/** 获取唯一统计服务，只有微信平台与显式配置均具备时允许授权启动 */
export const getAnalytics = () => {
  if (analytics) return analytics
  let enabled = false
  let driver: AnalyticsDriver = {
    start: async () => {},
    stop: () => {},
    resume: () => {},
    pause: () => {},
    pageStart: () => {},
    pageEnd: () => {},
    track: () => {}
  }
  // #ifdef MP-WEIXIN
  const appKey = import.meta.env.VITE_UMENG_APP_KEY ?? ''
  enabled =
    typeof wx !== 'undefined' &&
    import.meta.env.VITE_ANALYTICS_ENABLED === 'true' &&
    /^[A-Za-z0-9_-]{8,64}$/.test(appKey)
  if (enabled) driver = createUmengDriver({ factory: sdkFactory, native: wx, appKey })
  // #endif
  analytics = createAnalyticsService({
    enabled,
    driver,
    clientVersion: import.meta.env.VITE_CLIENT_VERSION || '1.3.0',
    storage: {
      read: (key) => uni.getStorageSync(key),
      write: (key, value) => uni.setStorageSync(key, value)
    }
  })
  return analytics
}

/** 显示统计用途说明，主动开启和首次未知授权共用同一个确认入口 */
export const requestAnalyticsConsent = () => {
  const service = getAnalytics()
  if (prompting || !service.isAvailable()) return
  prompting = true
  try {
    uni.showModal({
      title: '使用情况统计',
      content: `${ANALYTICS_NOTICE}\n友盟隐私政策：https://www.umeng.com/page/policy`,
      confirmText: '同意',
      cancelText: '暂不开启',
      /** 保存明确选择，result 为原生弹窗结果 */
      success: (result) => {
        void service.setConsent(Boolean(result.confirm))
      },
      complete: () => {
        prompting = false
      }
    })
  } catch {
    prompting = false
  }
}
