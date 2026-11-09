import { expect, it } from 'vitest'

import { resolveAnalyticsConfig } from '@/services/analytics-config'

it('enables only the explicitly configured test build', () => {
  expect(
    resolveAnalyticsConfig('test', 'mp-weixin', {
      VITE_UMENG_ENABLED: 'true',
      VITE_UMENG_TEST_APP_KEY: 'fixture-test'
    })
  ).toEqual({ enabled: true, appKey: 'fixture-test', environment: 'test' })
})
it.each(['production', 'development', 'local-share', 'local-share-h5'])(
  'never exposes the test key in %s',
  (mode) => {
    expect(
      resolveAnalyticsConfig(mode, 'mp-weixin', {
        VITE_UMENG_ENABLED: 'true',
        VITE_UMENG_TEST_APP_KEY: 'fixture-test'
      })
    ).toEqual({ enabled: false, appKey: '', environment: 'disabled' })
  }
)
it('disables H5, missing keys and an absent opt-in flag', () => {
  expect(
    resolveAnalyticsConfig('test', 'h5', {
      VITE_UMENG_ENABLED: 'true',
      VITE_UMENG_TEST_APP_KEY: 'fixture-test'
    }).enabled
  ).toBe(false)
  expect(resolveAnalyticsConfig('test', 'mp-weixin', { VITE_UMENG_ENABLED: 'true' }).enabled).toBe(
    false
  )
  expect(
    resolveAnalyticsConfig('test', 'mp-weixin', { VITE_UMENG_TEST_APP_KEY: 'fixture-test' }).enabled
  ).toBe(false)
})

it('selects the production key exclusively in production builds', () => {
  const env = {
    VITE_UMENG_ENABLED: 'true',
    VITE_UMENG_TEST_APP_KEY: 'fixture-test',
    VITE_UMENG_PROD_APP_KEY: 'fixture-prod'
  }
  expect(resolveAnalyticsConfig('production', 'mp-weixin', env)).toEqual({
    enabled: true,
    appKey: 'fixture-prod',
    environment: 'production'
  })
  expect(resolveAnalyticsConfig('test', 'mp-weixin', env)).toEqual({
    enabled: true,
    appKey: 'fixture-test',
    environment: 'test'
  })
  expect(
    resolveAnalyticsConfig('test', 'mp-weixin', {
      VITE_UMENG_ENABLED: 'true',
      VITE_UMENG_PROD_APP_KEY: 'fixture-prod'
    })
  ).toEqual({ enabled: false, appKey: '', environment: 'disabled' })
  expect(resolveAnalyticsConfig('production', 'h5', env).enabled).toBe(false)
  expect(resolveAnalyticsConfig('development', 'mp-weixin', env).enabled).toBe(false)
})
