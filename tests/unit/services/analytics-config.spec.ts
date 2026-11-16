import { expect, it } from 'vitest'

import { resolveAnalyticsConfig } from '@/services/analytics-config'

it('enables only the configured WeChat test app', () => {
  expect(
    resolveAnalyticsConfig('test', 'mp-weixin', {
      VITE_UMENG_ENABLED: 'true',
      VITE_UMENG_TEST_APP_KEY: 'fixture-test',
      VITE_UMENG_PROD_APP_KEY: 'fixture-prod'
    })
  ).toEqual({ enabled: true, appKey: 'fixture-test', environment: 'test' })
})
it.each(['production', 'development', 'local-share-h5'])(
  'keeps %s disabled despite private keys',
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
it.each([
  { VITE_UMENG_ENABLED: 'false', VITE_UMENG_TEST_APP_KEY: 'fixture-test' },
  { VITE_UMENG_ENABLED: 'true', VITE_UMENG_TEST_APP_KEY: '' },
  { VITE_UMENG_ENABLED: 'true', VITE_UMENG_PROD_APP_KEY: 'fixture-prod' }
])('rejects missing, disabled or wrong-environment test configuration', (env) => {
  expect(resolveAnalyticsConfig('test', 'mp-weixin', env).enabled).toBe(false)
  expect(
    resolveAnalyticsConfig('test', 'h5', {
      VITE_UMENG_ENABLED: 'true',
      VITE_UMENG_TEST_APP_KEY: 'fixture-test'
    }).enabled
  ).toBe(false)
})
