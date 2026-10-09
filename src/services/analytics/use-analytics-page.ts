import { onHide, onShow, onUnload } from '@dcloudio/uni-app'

import { getAnalytics, requestAnalyticsConsent } from '@/services/analytics/runtime'

/** 只在路由页面注册统计，route 为 pages.json 的静态页面地址 */
export const useAnalyticsPage = (route: string) => {
  const service = getAnalytics()
  onShow(() => {
    service.pageShow(route)
    if (service.needsPrompt()) requestAnalyticsConsent()
  })
  onHide(() => service.pageHide(route))
  onUnload(() => service.pageHide(route))
}
