import { ANALYTICS_ENDPOINTS, ANALYTICS_STORAGE_PREFIX } from '@/shared/constants/analytics'

import type {
  AnalyticsDriver,
  AnalyticsLaunch,
  AnalyticsNative,
  AnalyticsNativeCall,
  AnalyticsRequestTask,
  UmengScope,
  UmengSdk,
  UmengSdkFactory
} from '@/shared/types/analytics'

/** 过滤来源，launch 为微信启动信息；不将任意路由 query 交给第三方 SDK */
export const sanitizeLaunch = (launch: AnalyticsLaunch = {}): AnalyticsLaunch => {
  const result: AnalyticsLaunch = { query: {} }
  if (Number.isInteger(launch.scene) && launch.scene! > 0) result.scene = launch.scene
  if (launch.path && /^(?:pages|sub-packages)\/[a-z0-9/-]+$/.test(launch.path))
    result.path = launch.path
  if (launch.referrerInfo?.appId && /^wx[a-zA-Z0-9]{1,32}$/.test(launch.referrerInfo.appId))
    result.referrerInfo = { appId: launch.referrerInfo.appId }
  return result
}

/** 创建可撤回驱动，options 为静态 SDK 工厂、微信端口和当前环境 AppKey */
export const createUmengDriver = (options: {
  factory: UmengSdkFactory
  native: AnalyticsNative
  appKey: string
}): AnalyticsDriver => {
  let sdk: UmengSdk | undefined
  let shutdown: (() => void) | undefined
  const prefix = `${ANALYTICS_STORAGE_PREFIX}${options.appKey}.`

  /** 关闭旧实例并清除专属缓存，保留业务令牌与学习进度 */
  const stop = () => {
    shutdown?.()
    shutdown = undefined
    sdk = undefined
    try {
      options.native
        .getStorageInfoSync()
        .keys.filter((key) => key.startsWith(prefix))
        .forEach((key) => options.native.removeStorageSync(key))
    } catch {
      /* 缓存清理失败也不能恢复旧实例 */
    }
  }

  /** 同意后创建实例，所有第三方能力均受本实例 active 标志控制 */
  const start = (): Promise<void> => {
    shutdown?.()
    let active = true
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const intervals = new Set<ReturnType<typeof setInterval>>()
    const tasks = new Set<AnalyticsRequestTask>()
    const listeners = new Set<(event: unknown) => void>()
    let rejectStart: ((reason: Error) => void) | undefined
    /** 撤回后阻断迟到回调，callback 为 SDK 处理函数，value 为微信返回值 */
    const callback = (handler: ((value: unknown) => void) | undefined, value: unknown) => {
      if (active) {
        try {
          handler?.(value)
        } catch {
          /* 第三方回调异常不影响业务 */
        }
      }
    }
    /** 包装异步结果，call 为 SDK 请求参数 */
    const guardedCall = (call: AnalyticsNativeCall): AnalyticsNativeCall => ({
      ...call,
      success: (value) => callback(call.success, value),
      fail: (value) => callback(call.fail, value),
      complete: (value) => callback(call.complete, value)
    })
    /** 校验专属缓存键，key 为 SDK 内部固定键 */
    const storageKey = (key?: string) => {
      if (!key || !/^[A-Za-z0-9_{}.-]{1,160}$/.test(key)) throw new Error('invalid analytics key')
      return `${prefix}${key}`
    }
    const platform: Record<string, unknown> = {
      /** 只允许统计服务请求，call 为 SDK 网络请求 */
      request: (call: AnalyticsNativeCall) => {
        if (!active) return
        if (
          !call.url ||
          !ANALYTICS_ENDPOINTS.some((host) => call.url!.startsWith(`https://${host}/`))
        ) {
          callback(call.fail, { errMsg: 'analytics endpoint blocked' })
          return
        }
        const wrapped = guardedCall(call)
        const owned: { task?: AnalyticsRequestTask } = {}
        let completed = false
        wrapped.complete = (value) => {
          completed = true
          if (owned.task) tasks.delete(owned.task)
          callback(call.complete, value)
        }
        owned.task = options.native.request(wrapped)
        if (!completed) tasks.add(owned.task)
        return owned.task
      },
      /** 同步读专属缓存并回调，call 为 SDK 缓存请求，避免撤回后异步回填 */
      getStorage: (call: AnalyticsNativeCall) => {
        if (!active) return
        try {
          callback(call.success, { data: options.native.getStorageSync(storageKey(call.key)) })
        } catch {
          callback(call.fail, { errMsg: 'analytics storage unavailable' })
        }
      },
      /** 同步写专属缓存，call 为 SDK 缓存内容 */
      setStorage: (call: AnalyticsNativeCall) => {
        if (!active) return
        try {
          options.native.setStorageSync(storageKey(call.key), call.data)
          callback(call.success, {})
        } catch {
          callback(call.fail, { errMsg: 'analytics storage unavailable' })
        }
      },
      /** 删除专属缓存，call 为 SDK 内部缓存键 */
      removeStorage: (call: AnalyticsNativeCall) => {
        if (!active) return
        try {
          options.native.removeStorageSync(storageKey(call.key))
          callback(call.success, {})
        } catch {
          callback(call.fail, { errMsg: 'analytics storage unavailable' })
        }
      },
      /** 获取设备基础信息，call 为 SDK 回调 */
      getSystemInfo: (call: AnalyticsNativeCall) => {
        if (active) return options.native.getSystemInfo(guardedCall(call))
      },
      /** 获取网络类型，call 为 SDK 回调 */
      getNetworkType: (call: AnalyticsNativeCall) => {
        if (active) return options.native.getNetworkType(guardedCall(call))
      },
      getAccountInfoSync: () => (active ? options.native.getAccountInfoSync?.() : undefined),
      getLaunchOptionsSync: () =>
        active ? sanitizeLaunch(options.native.getLaunchOptionsSync?.()) : {},
      /** 保存可释放网络监听，listener 为 SDK 内部处理函数 */
      onNetworkStatusChange: (listener: (event: unknown) => void) => {
        if (!active) return
        const guarded = (value: unknown) => callback(listener, value)
        listeners.add(guarded)
        options.native.onNetworkStatusChange(guarded)
      }
    }
    const scope: UmengScope = {
      wx: platform,
      /** 追踪 SDK 延迟任务，handler 为待执行操作，delay 为毫秒延迟 */
      setTimeout: (handler, delay) => {
        const timer = setTimeout(() => {
          timers.delete(timer)
          if (active) {
            try {
              handler()
            } catch {
              /* 统计任务不影响业务 */
            }
          }
        }, delay)
        if (active) timers.add(timer)
        else clearTimeout(timer)
        return timer
      },
      /** 取消 SDK 延迟任务，timer 为实例拥有的任务 */
      clearTimeout: (timer) => {
        timers.delete(timer)
        clearTimeout(timer)
      },
      /** 追踪 SDK 周期任务，handler 为待执行操作，delay 为毫秒间隔 */
      setInterval: (handler, delay) => {
        const timer = setInterval(() => {
          if (active) {
            try {
              handler()
            } catch {
              /* 同上 */
            }
          }
        }, delay)
        if (active) intervals.add(timer)
        else clearInterval(timer)
        return timer
      },
      /** 取消 SDK 周期任务，timer 为实例拥有的任务 */
      clearInterval: (timer) => {
        intervals.delete(timer)
        clearInterval(timer)
      }
    }
    shutdown = () => {
      active = false
      timers.forEach(clearTimeout)
      intervals.forEach(clearInterval)
      tasks.forEach((task) => {
        try {
          task.abort?.()
        } catch {
          /* 阻断回调仍有效 */
        }
      })
      listeners.forEach((listener) => {
        try {
          options.native.offNetworkStatusChange?.(listener)
        } catch {
          /* 旧监听的回调仍被 active 阻断 */
        }
      })
      timers.clear()
      intervals.clear()
      tasks.clear()
      listeners.clear()
      rejectStart?.(new Error('analytics stopped'))
    }
    return new Promise<void>((resolve, reject) => {
      rejectStart = reject
      try {
        const instance = options.factory(scope)
        sdk = instance
        // 指纹锁定的 2.8.0 在安装所有公开方法后发出事件 1
        instance.messager.once(1, () => {
          if (!active) return
          rejectStart = undefined
          resolve()
        })
        instance.init({
          appKey: options.appKey,
          useOpenid: false,
          autoGetOpenid: false,
          uploadUserInfo: false,
          debug: false,
          enableVerify: false
        })
      } catch (error) {
        reject(error)
      }
    })
  }
  return {
    start,
    stop,
    resume: (launch) =>
      sdk?.resume(sanitizeLaunch(launch ?? options.native.getLaunchOptionsSync?.())),
    pause: () => sdk?.pause(),
    pageStart: (route) => sdk?.trackPageStart(route),
    pageEnd: (route) => sdk?.trackPageEnd(route),
    track: (event, params) => sdk?.trackEvent(event, params)
  }
}
