import { createAnalyticsNative } from '@/services/analytics-native'
import { analyticsPageProperties } from '@/services/analytics-page'
import { createAnalyticsService } from '@/services/analytics-service'
import { runtimeMode } from '@/services/runtime-mode'

const configuration =
  typeof __JUYA_ANALYTICS_CONFIG__ === 'undefined'
    ? { enabled: false, appKey: '', environment: 'disabled' as const }
    : __JUYA_ANALYTICS_CONFIG__
export const analytics = createAnalyticsService({
  config: configuration,
  storage: {
    get: (key) => (typeof uni === 'undefined' ? undefined : uni.getStorageSync(key)),
    set: (key, value) => {
      uni.setStorageSync(key, value)
    },
    remove: (key) => {
      uni.removeStorageSync(key)
    }
  },
  onConsentChanged: (agreed) => {
    if (agreed) analyticsNative.resume()
    else analyticsNative.stop()
  },
  isPermitted: () => !runtimeMode.update(),
  pageProperties: () =>
    analyticsPageProperties(
      typeof getCurrentPages === 'undefined' ? undefined : getCurrentPages().at(-1)
    ),
  currentPage: () =>
    typeof getCurrentPages === 'undefined' ? '' : getCurrentPages().at(-1)?.route || ''
})

export const analyticsNative = createAnalyticsNative({
  storageNamespace:
    configuration.environment === 'production' ? 'juya-umeng-prod:' : 'juya-umeng-test:',
  native: () =>
    ((globalThis as typeof globalThis & { wx?: unknown }).wx || {}) as Record<string, unknown>,
  hasConsent: () => analytics.hasConsent()
})
