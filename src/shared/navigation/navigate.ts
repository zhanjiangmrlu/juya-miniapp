import type { NavigationIntent } from './routes'

/** 根据路由意图调用对应的 uni-app 导航 API，并统一为 Promise 接口。 */
export function navigate(intent: NavigationIntent): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = { fail: reject, success: () => resolve(), url: intent.url }

    if (intent.type === 'navigateTo') {
      uni.navigateTo(options)
      return
    }

    if (intent.type === 'redirectTo') {
      uni.redirectTo(options)
      return
    }

    uni.reLaunch(options)
  })
}
