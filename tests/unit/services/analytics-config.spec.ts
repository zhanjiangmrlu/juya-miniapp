import { expect, it } from 'vitest'

import { resolveAnalyticsConfig } from '@/services/analytics-config'
it.each(['test', 'production', 'development', 'local-share-h5'])(
  'keeps real transport disabled even with both private keys in %s',
  (mode) => {
    expect(
      resolveAnalyticsConfig(mode, 'mp-weixin', {
        VITE_UMENG_ENABLED: 'true',
        VITE_UMENG_TEST_APP_KEY: 'fixture-test',
        VITE_UMENG_PROD_APP_KEY: 'fixture-prod'
      })
    ).toEqual({ enabled: false, appKey: '', environment: 'disabled' })
  }
)
