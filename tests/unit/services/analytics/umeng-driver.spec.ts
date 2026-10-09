import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createUmengDriver, sanitizeLaunch } from '@/services/analytics/umeng-driver'

import type { AnalyticsNative, UmengSdkFactory } from '@/shared/types/analytics'

import { wrapUmengSource } from '../../../../build/umeng-sdk'

const require = createRequire(import.meta.url)
const source = readFileSync(require.resolve('umtrack-wx'), 'utf8')
// 仅在测试中执行构建结果，正式应用由 Vite 静态编译，不使用 eval
const factory = new Function(
  wrapUmengSource(source).replace('export default', 'return')
)() as UmengSdkFactory

const makeDriver = () => {
  const storage = new Map<string, unknown>()
  const requests: { success?: (value: unknown) => void; fail?: (value: unknown) => void }[] = []
  const abort = vi.fn()
  const native = {
    getStorageSync: (key: string) => storage.get(key),
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key),
    getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
    getSystemInfo: vi.fn((options) =>
      options.success?.({
        system: 'iOS 17',
        screenWidth: 390,
        screenHeight: 844,
        pixelRatio: 3,
        model: 'iPhone',
        brand: 'Apple'
      })
    ),
    getNetworkType: vi.fn((options) => options.success?.({ networkType: 'wifi' })),
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'trial', version: '1.0' } }),
    getLaunchOptionsSync: () => ({
      scene: 1001,
      path: 'pages/home/index',
      query: { token: 'secret', wechat_id: 'private' }
    }),
    onNetworkStatusChange: vi.fn(),
    offNetworkStatusChange: vi.fn(),
    request: vi.fn((options) => {
      requests.push(options)
      return { abort }
    })
  } satisfies AnalyticsNative
  return {
    storage,
    native,
    requests,
    abort,
    driver: createUmengDriver({ factory, native, appKey: 'test-key' })
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('真实 2.8.0 SDK 隔离与撤回', () => {
  it('不改写全局页面函数，不使用全局 wx.uma，未启动不读取设备或请求', async () => {
    const App = vi.fn(),
      Page = vi.fn(),
      Component = vi.fn()
    const wx = { marker: true }
    vi.stubGlobal('App', App)
    vi.stubGlobal('Page', Page)
    vi.stubGlobal('Component', Component)
    vi.stubGlobal('wx', wx)
    const { driver, native } = makeDriver()
    expect(native.getSystemInfo).not.toHaveBeenCalled()
    expect(native.request).not.toHaveBeenCalled()
    await driver.start()
    const globals = globalThis as unknown as Record<string, unknown>
    expect(globals.App).toBe(App)
    expect(globals.Page).toBe(Page)
    expect(globals.Component).toBe(Component)
    expect(wx).toEqual({ marker: true })
    driver.stop()
  })

  it('撤回取消请求和定时器，不接受迟到成功回调，不再写缓存或补发', async () => {
    vi.useFakeTimers()
    const { driver, native, abort, requests, storage } = makeDriver()
    storage.set('juya.access-token', 'keep')
    await driver.start()
    driver.resume()
    driver.pageStart('pages/home/index')
    driver.track('scene_click', { content_scene_id: 'coffee' })
    await vi.advanceTimersByTimeAsync(1)
    expect(native.request).toHaveBeenCalled()
    const count = native.request.mock.calls.length
    driver.stop()
    requests.forEach((request) => request.success?.({ statusCode: 200, data: { code: 200 } }))
    await vi.advanceTimersByTimeAsync(60000)
    expect(native.request).toHaveBeenCalledTimes(count)
    expect(abort).toHaveBeenCalled()
    expect(storage).toEqual(new Map([['juya.access-token', 'keep']]))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('初始化未完成时关闭会终止初始化 promise，后续重新开启创建新实例', async () => {
    vi.useFakeTimers()
    const { native } = makeDriver()
    const driver = createUmengDriver({
      native,
      appKey: 'test-key',
      factory: (scope) => {
        const instance = factory(scope)
        const init = instance.init.bind(instance)
        instance.init = (config) => {
          scope.setTimeout(() => init(config), 10)
        }
        return instance
      }
    })
    const starting = driver.start()
    driver.stop()
    await expect(starting).rejects.toThrow()
    const restarting = driver.start()
    await vi.advanceTimersByTimeAsync(10)
    await expect(restarting).resolves.toBeUndefined()
    driver.stop()
  })

  it('启动来源不带任意 query、用户值、无效路由或未知字段', () => {
    expect(
      sanitizeLaunch({
        scene: 1001,
        path: 'pages/home/index',
        query: { token: 'secret', wechat_id: 'private' },
        referrerInfo: { appId: 'wx1234' }
      })
    ).toEqual({
      scene: 1001,
      path: 'pages/home/index',
      query: {},
      referrerInfo: { appId: 'wx1234' }
    })
    expect(sanitizeLaunch({ path: 'https://private.test/?token=secret' }).path).toBeUndefined()
  })

  it('SDK 内容变化必须重新验证，不能静默编译未知版本', () => {
    expect(() => wrapUmengSource(source + '\nchanged')).toThrow('重新验证')
  })
})
