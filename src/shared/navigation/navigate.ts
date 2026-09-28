import type { NavigationIntent } from './routes'

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
