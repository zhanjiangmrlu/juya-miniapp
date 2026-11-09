import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

import { expect, it } from 'vitest'

import { createAnalyticsNative } from '@/services/analytics-native'
import { createAnalyticsService } from '@/services/analytics-service'

import type { AnalyticsSDK } from '@/shared/types/analytics'

const require = createRequire(import.meta.url)
/** 用隔离微信端口运行真实已锁定的友盟包，网络请求只留在内存
 * @param delayed 是否延迟原生存储回调
 * @param environment 本次SDK和授权所用的独立环境
 */
const loadSDK = (delayed = false, environment: 'test' | 'production' = 'test') => {
  const callbacks: (() => void)[] = [],
    timers: (() => void)[] = []
  const nativeCalls: string[] = [],
    requests: unknown[] = [],
    saved = new Map<string, unknown>()
  let app: Record<string, (...args: unknown[]) => void> = {},
    page: Record<string, (...args: unknown[]) => void> = {},
    component: { methods?: typeof page } = {}
  const wx = {
    getStorage: ({
      key,
      success,
      fail
    }: {
      key: string
      success: (result: unknown) => void
      fail: (result: unknown) => void
    }) => {
      nativeCalls.push('getStorage')
      const done = () =>
        saved.has(key) ? success({ data: saved.get(key) }) : fail({ errMsg: 'not found' })
      if (delayed) callbacks.push(done)
      else done()
    },
    setStorage: ({ key, data, success }: { key: string; data: unknown; success?: () => void }) => {
      nativeCalls.push('setStorage')
      saved.set(key, data)
      success?.()
    },
    removeStorage: ({ key, success }: { key: string; success?: () => void }) => {
      saved.delete(key)
      success?.()
    },
    removeStorageSync: (key: string) => {
      saved.delete(key)
    },
    getSystemInfo: ({ success }: { success: (result: unknown) => void }) => {
      nativeCalls.push('getSystemInfo')
      success({
        model: 'fixture',
        brand: 'fixture',
        pixelRatio: 3,
        screenWidth: 390,
        screenHeight: 844,
        system: 'iOS 18',
        SDKVersion: '3.0.0',
        version: '8.0.0',
        platform: 'ios',
        language: 'zh_CN'
      })
    },
    getNetworkType: ({ success }: { success: (result: unknown) => void }) => {
      nativeCalls.push('getNetworkType')
      success({ networkType: 'wifi' })
    },
    getAccountInfoSync: () => ({
      miniProgram: { appId: 'fixture-app', envVersion: 'develop', version: 'fixture' }
    }),
    getLaunchOptionsSync: () => ({
      scene: 1001,
      query: { token: 'private-launch-token' },
      path: 'pages/home/index?token=private-launch-token'
    }),
    request: (input: unknown) => {
      nativeCalls.push('request')
      requests.push(input)
    },
    onNetworkStatusChange: () => {},
    login: () => {
      throw new Error('Statistics must not invoke WeChat login')
    },
    getUserInfo: () => {
      throw new Error('Statistics must not read user profile')
    }
  }
  const scope = createAnalyticsNative({
    storageNamespace: `${environment}:`,
    native: () => wx as unknown as Record<string, unknown>,
    hasConsent: () => service?.hasConsent() === true
  })
  const context = {
    wx: scope.wx,
    App: (value: typeof app) => {
      app = value
    },
    Page: (value: typeof page) => {
      page = value
    },
    Component: (value: typeof component) => {
      component = value
    },
    module: { exports: {} },
    console: { log: () => {}, warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
    setTimeout: (callback: () => void) => {
      timers.push(callback)
      return timers.length
    },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {}
  }
  runInNewContext(readFileSync(require.resolve('umtrack-wx'), 'utf8'), context, { timeout: 2000 })
  const service = createAnalyticsService({
    config: { enabled: true, appKey: `fixture-${environment}-key`, environment },
    storage: {
      get: (key) => saved.get(key),
      set: (key, value) => {
        saved.set(key, value)
      },
      remove: (key) => {
        saved.delete(key)
      }
    },
    currentPage: () => 'pages/home/index',
    onConsentChanged: (agreed) => {
      if (agreed) scope.resume()
      else scope.stop()
    }
  })
  service.attach(context.module.exports as AnalyticsSDK)
  return {
    context,
    service,
    nativeCalls,
    requests,
    storageKeys: () => [...saved.keys()],
    app: () => app,
    page: () => page,
    component: () => component.methods || {},
    callbacks,
    timers
  }
}

it.each(['page', 'component'])(
  'records registered %s entries through real SDK hooks and ignores duplicate unloads',
  (kind) => {
    const { context, service, page, component } = loadSDK()
    service.foreground()
    service.setConsent(true)
    const events: unknown[][] = []
    const sdk = context.module.exports as AnalyticsSDK
    sdk.trackPageEnd('pages/home/index')
    sdk.trackEvent = (...args) => events.push(args)
    const routes = JSON.parse(
      readFileSync(new URL('../../../src/pages.json', import.meta.url), 'utf8')
    ) as {
      pages: { path: string }[]
      subPackages: { root: string; pages: { path: string }[] }[]
    }
    if (kind === 'page') context.Page({})
    else context.Component({ methods: {} })
    const hooks = kind === 'page' ? page : component
    const paths = [
      ...routes.pages.map(({ path }) => path),
      ...routes.subPackages.flatMap(({ root, pages }) => pages.map(({ path }) => `${root}/${path}`))
    ]
    for (const route of paths) {
      const instance = { route }
      hooks().onShow?.call(instance)
      hooks().onHide?.call(instance)
      hooks().onUnload?.call(instance)
    }
    expect(
      events
        .filter(([id]) => id === 'page_enter')
        .map(([, properties]) => (properties as { page_path: string }).page_path)
    ).toEqual(paths)
    expect(events.filter(([id]) => id === 'page_stay')).toHaveLength(paths.length)
  }
)

it('keeps the real SDK silent until explicit consent and preserves native share parameters', () => {
  const { context, service, nativeCalls, requests, app, page } = loadSDK()
  context.App({})
  context.Page({ onShareAppMessage: () => ({ path: '/pages/home/index', title: 'fixture' }) })
  app().onLaunch?.({})
  app().onShow?.({ query: { token: 'before-consent' } })
  page().onShow?.call({ route: 'pages/before/index' })
  service.foreground({ scene: 1001 })
  service.track('learning_start', { content_id: 'before-consent' })
  expect(nativeCalls).toEqual([])
  service.setConsent(true)
  service.track('learning_complete', { content_type: 'scene', content_id: 'fixture-card' })
  app().onHide?.()
  expect(nativeCalls).toContain('getSystemInfo')
  expect(requests.length).toBeGreaterThan(0)
  expect(JSON.stringify(requests)).not.toContain('before-consent')
  expect(page().onShareAppMessage?.()).toEqual({ path: '/pages/home/index', title: 'fixture' })
})

it('stops the real SDK asynchronous initialization and timers after withdrawal', () => {
  const { service, nativeCalls, callbacks, timers } = loadSDK(true)
  service.foreground()
  service.setConsent(true)
  service.setConsent(false)
  const before = [...nativeCalls]
  for (let count = 0; count < 20 && callbacks.length; count++) callbacks.shift()?.()
  for (const timer of timers.splice(0)) timer()
  expect(nativeCalls).toEqual(before)
})

it('can finish initialization after consent is enabled again without replaying unconsented activity', () => {
  const { service, nativeCalls, callbacks, context } = loadSDK(true)
  service.foreground()
  service.setConsent(true)
  service.setConsent(false)
  for (let count = 0; count < 20 && callbacks.length; count++) callbacks.shift()?.()
  service.track('learning_start', { content_id: 'while-disabled' })
  service.setConsent(true)
  for (let count = 0; count < 40 && callbacks.length; count++) callbacks.shift()?.()
  service.track('learning_complete', { content_id: 'after-consent' })
  ;(context.module.exports as AnalyticsSDK).pause()
  expect(nativeCalls).toContain('getSystemInfo')
  expect(nativeCalls).toContain('request')
})

it('exposes only the numeric entry scene through the SDK native scope', () => {
  const { service, context } = loadSDK()
  service.foreground()
  service.setConsent(true)
  expect((context.wx.getLaunchOptionsSync as () => unknown)()).toEqual({ scene: 1001 })
})

it('uses the production key and isolated persisted state through the real SDK', () => {
  const { service, requests, storageKeys, app, context } = loadSDK(false, 'production')
  context.App({})
  service.foreground()
  service.setConsent(true)
  service.track('learning_complete', { content_id: 'fixture-content' })
  app().onHide?.()
  expect(requests.length).toBeGreaterThan(0)
  expect(JSON.stringify(requests)).toContain('fixture-production-key')
  expect(JSON.stringify(requests)).not.toContain('fixture-test-key')
  expect(storageKeys().some((key) => key.startsWith('production:'))).toBe(true)
  expect(storageKeys()).toContain('juya-analytics-prod-consent-v1')
  expect(storageKeys()).not.toContain('um_uuid')
})
