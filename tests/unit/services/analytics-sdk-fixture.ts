import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

import { createAnalyticsService } from '@/services/analytics-service'

import type {
  AnalyticsRuntimeContext,
  AnalyticsSDK,
  AnalyticsSDKScope
} from '@/shared/types/analytics'
import type { CanonicalAnalyticsEvent } from '@/shared/types/privacy'

const require = createRequire(import.meta.url)
const source = readFileSync(require.resolve('umtrack-wx'), 'utf8')
/** 在内存微信端口执行锁定 SDK；options 控制原生延迟、离线及服务端事件授权 */
export const analyticsFixture = (
  options: {
    delayed?: boolean
    offline?: boolean
    authorize?: (event: CanonicalAnalyticsEvent) => Promise<void>
    production?: boolean
  } = {}
) => {
  let context: AnalyticsRuntimeContext = {
    owner: null,
    revision: 0,
    enabled: false,
    scopeVersion: 'fixture-scope',
    policiesReady: false
  }
  let instances = 0
  const calls: string[] = [],
    authorized: CanonicalAnalyticsEvent[] = []
  const requests: { url: string; data: Record<string, unknown>; abort: boolean }[] = []
  const callbacks: (() => void)[] = []
  const native = {
    getStorage: () => {
      throw new Error('SDK must not read business storage')
    },
    setStorage: () => {
      throw new Error('SDK must not persist identifiers or queues')
    },
    getSystemInfo: ({ success }: { success: (value: unknown) => void }) => {
      calls.push('getSystemInfo')
      const done = () =>
        success({
          model: 'fixture-model',
          brand: 'fixture-brand',
          system: 'iOS 18',
          version: '8.0.0',
          SDKVersion: '3.0.0',
          platform: 'ios',
          language: 'zh_CN',
          pixelRatio: 3,
          screenWidth: 390,
          screenHeight: 844
        })
      if (options.delayed) callbacks.push(done)
      else done()
    },
    getNetworkType: ({ success }: { success: (value: unknown) => void }) => {
      calls.push('getNetworkType')
      success({ networkType: 'wifi' })
    },
    getAccountInfoSync: () => {
      calls.push('getAccountInfoSync')
      return {
        miniProgram: { appId: 'fixture-wechat-app', envVersion: 'trial', version: 'fixture' }
      }
    },
    getLaunchOptionsSync: () => ({
      scene: 1001,
      path: 'private-input',
      query: { token: 'fixture-login-token', openid: 'fixture-openid' }
    }),
    login: () => {
      throw new Error('SDK cannot acquire OpenID')
    },
    getUserInfo: () => {
      throw new Error('SDK cannot acquire profile')
    },
    request: (input: {
      url: string
      data?: Record<string, unknown>
      success?: (value: unknown) => void
      fail?: (value: unknown) => void
    }) => {
      calls.push('request')
      const request = {
        url: input.url,
        data: JSON.parse(JSON.stringify(input.data || {})),
        abort: false
      }
      requests.push(request)
      if (options.offline) input.fail?.({ errMsg: 'fixture offline' })
      else input.success?.({ statusCode: 200, data: {} })
      return {
        abort: () => {
          request.abort = true
        }
      }
    }
  }
  const service = createAnalyticsService({
    config: {
      enabled: true,
      appKey: 'fixture-test-key',
      environment: options.production ? 'production' : 'test'
    },
    native: () => native,
    createSDK: (scope: AnalyticsSDKScope) => {
      instances++
      const runtime = {
        ...scope,
        module: { exports: {} },
        console: {
          log: () => {},
          warn: () => {},
          info: () => {},
          error: () => {},
          debug: () => {}
        },
        Date
      }
      runInNewContext(source, runtime, { timeout: 2000 })
      return runtime.module.exports as AnalyticsSDK
    }
  })
  service.configure({
    context: () => context,
    currentPage: () => 'pages/home/index?token=fixture-login-token',
    authorize: async (event) => {
      authorized.push(event)
      await options.authorize?.(event)
    }
  })
  /** 切换可信上下文并立即执行同步代际门禁；value 为新账号或许可状态 */
  const update = (value: Partial<AnalyticsRuntimeContext>) => {
    context = { ...context, ...value }
    service.sync()
  }
  /** 解析内存捕获中的 SDK 自定义事件 */
  const events = () =>
    requests.flatMap((request) =>
      Object.values(
        (request.data.a as { e?: Record<string, unknown[]> } | undefined)?.e || {}
      ).flat()
    ) as Record<string, unknown>[]
  return {
    service,
    update,
    context: () => context,
    calls,
    requests,
    callbacks,
    authorized,
    events,
    instances: () => instances
  }
}
