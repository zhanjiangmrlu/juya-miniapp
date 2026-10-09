import { NavigationType } from '@/shared/enums/navigation'

import type { NavigationIntent } from '@/shared/types/navigation'

import { normalizePageUrl } from './page-url'

/** 执行导航并兼容旧页面地址，intent 为目标页面与对应的导航方式 */
export const navigate = (intent: NavigationIntent): Promise<void> => {
  return new Promise((resolve, reject) => {
    const options = { fail: reject, success: () => resolve(), url: normalizePageUrl(intent.url) }

    if (intent.type === NavigationType.NAVIGATE_TO) {
      uni.navigateTo(options)
      return
    }

    if (intent.type === NavigationType.REDIRECT_TO) {
      uni.redirectTo(options)
      return
    }

    uni.reLaunch(options)
  })
}
