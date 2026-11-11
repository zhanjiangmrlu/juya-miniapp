import type {
  AnalyticsMethod,
  AnalyticsNativePorts,
  AnalyticsSDKScope
} from '@/shared/types/analytics'

/** 为单个账号许可代际提供内存存储、可销毁定时器及最小微信能力
 * @param ports 原生读取端口、当前代际有效性及可信业务账号
 */
export const createAnalyticsNative = (ports: AnalyticsNativePorts) => {
  let active = true,
    sequence = 0
  const storage = new Map<string, unknown>()
  const requests = new Set<{ abort?: () => void }>()
  const timers = new Map<number, { handle: ReturnType<typeof setTimeout>; interval: boolean }>()
  /** 永久废弃当前代际，清理请求、计时器和全部内存状态 */
  const stop = () => {
    active = false
    storage.clear()
    for (const { handle, interval } of timers.values()) {
      if (interval) clearInterval(handle)
      else clearTimeout(handle)
    }
    timers.clear()
    for (const request of requests) {
      try {
        request.abort?.()
      } catch {
        /* 已完成请求不阻塞清理 */
      }
    }
    requests.clear()
  }
  /** 每次原生调用与回调均复核当前账号和许可，不恢复旧回调 */
  const permitted = () => active && ports.hasConsent()
  /** 复制 SDK 数据以隔离可变引用；value 为单次原生数据 */
  const copy = (value: unknown) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value))
  /** 只交付仍属于当前许可的异步回调；callback 为 SDK 回调，values 为原生结果 */
  const deliver = (callback: unknown, ...values: unknown[]) => {
    if (permitted() && typeof callback === 'function') (callback as AnalyticsMethod)(...values)
  }
  /** 仅转发必要的设备和网络读取；name 为白名单 API，input 为 SDK 参数 */
  const read = (name: string, input: Record<string, unknown> = {}) => {
    if (!permitted()) return
    const native = ports.native(),
      method = native[name]
    if (typeof method !== 'function') {
      deliver(input.fail, { errMsg: 'unavailable' })
      return
    }
    return method.call(native, {
      success: (...values: unknown[]) => deliver(input.success, ...values),
      fail: (...values: unknown[]) => deliver(input.fail, ...values),
      complete: (...values: unknown[]) => deliver(input.complete, ...values)
    })
  }
  /** 只向友盟主域名发送当前账号的基础会话及白名单事件；input 为 SDK 网络参数 */
  const request = (input: Record<string, unknown>) => {
    if (!permitted()) return
    const url = input.url
    if (
      ![
        'https://umini.shujupie.com/wxm_logs',
        'https://umini.shujupie.com/uminiprogram_logs/ckdh'
      ].includes(String(url))
    )
      return
    const data = copy(input.data) as
      { h?: { itr?: Record<string, unknown>; ttn?: unknown }; a?: unknown } | undefined
    if (String(url).endsWith('/wxm_logs')) {
      const identity = data?.h?.itr
      if (
        !identity ||
        identity.puid !== ports.owner ||
        Object.keys(identity).some((key) => !['ud', 'puid'].includes(key)) ||
        data?.h?.ttn
      )
        return
    }
    const native = ports.native(),
      method = native.request
    if (typeof method !== 'function') return
    const state: { task?: { abort?: () => void }; completed: boolean } = { completed: false }
    const task = method.call(native, {
      url,
      method: String(url).endsWith('/wxm_logs') ? 'POST' : 'GET',
      header: String(url).endsWith('/wxm_logs')
        ? { 'Msg-Type': 'wxmp/json', 'disable-base64': 'Y' }
        : {},
      data,
      success: (...values: unknown[]) => deliver(input.success, ...values),
      fail: (...values: unknown[]) => deliver(input.fail, ...values),
      complete: (...values: unknown[]) => {
        state.completed = true
        if (state.task) requests.delete(state.task)
        deliver(input.complete, ...values)
      }
    }) as { abort?: () => void } | undefined
    state.task = task
    if (task) {
      if (!permitted()) task.abort?.()
      else if (!state.completed) requests.add(task)
    }
    return task
  }
  /** 在当前代际注册可清理的计时任务；callback 为 SDK 任务，delay 为毫秒，interval 表示重复任务 */
  const schedule = (callback: () => void, delay = 0, interval = false) => {
    if (!permitted()) return 0
    const id = ++sequence
    /** 计时触发时复核代际，不把撤回期间的任务留待重新许可 */
    const run = () => {
      if (!interval) timers.delete(id)
      if (permitted()) callback()
    }
    const handle = interval ? setInterval(run, delay) : setTimeout(run, delay)
    timers.set(id, { handle, interval })
    return id
  }
  /** 取消本代际计时器；id 为 SDK 获得的隔离计时标识 */
  const cancel = (id: number) => {
    const timer = timers.get(id)
    if (!timer) return
    if (timer.interval) clearInterval(timer.handle)
    else clearTimeout(timer.handle)
    timers.delete(id)
  }
  const wx: Record<string, unknown> = {
    getStorage: (input: { key: string; success?: AnalyticsMethod; fail?: AnalyticsMethod }) => {
      if (!permitted()) return
      if (storage.has(input.key)) deliver(input.success, { data: copy(storage.get(input.key)) })
      else deliver(input.fail, { errMsg: 'not found' })
    },
    setStorage: (input: { key: string; data: unknown; success?: AnalyticsMethod }) => {
      if (!permitted()) return
      storage.set(input.key, copy(input.data))
      deliver(input.success, {})
    },
    removeStorage: (input: { key: string; success?: AnalyticsMethod }) => {
      if (!permitted()) return
      storage.delete(input.key)
      deliver(input.success, {})
    },
    getStorageSync: (key: string) => (permitted() ? copy(storage.get(key)) : undefined),
    setStorageSync: (key: string, value: unknown) => {
      if (permitted()) storage.set(key, copy(value))
    },
    removeStorageSync: (key: string) => {
      if (permitted()) storage.delete(key)
    },
    getSystemInfo: (input: Record<string, unknown>) => read('getSystemInfo', input),
    getNetworkType: (input: Record<string, unknown>) => read('getNetworkType', input),
    getAccountInfoSync: () => {
      if (!permitted()) return {}
      const native = ports.native(),
        method = native.getAccountInfoSync
      if (typeof method !== 'function') return {}
      const mini = (
        method.call(native) as {
          miniProgram?: { appId?: string; envVersion?: string; version?: string }
        }
      )?.miniProgram
      return {
        miniProgram: mini
          ? { appId: mini.appId, envVersion: mini.envVersion, version: mini.version }
          : {}
      }
    },
    getLaunchOptionsSync: () => {
      if (!permitted()) return {}
      const native = ports.native(),
        method = native.getLaunchOptionsSync
      const value =
        typeof method === 'function' ? (method.call(native) as { scene?: unknown }) : undefined
      return typeof value?.scene === 'number' ? { scene: value.scene } : {}
    },
    onNetworkStatusChange: () => undefined,
    request
  }
  /** 在私有作用域接受 SDK 注册器，不接触业务全局；value 为 SDK 私有注册内容 */
  const register = (value: unknown) => value
  const scope: AnalyticsSDKScope = {
    wx,
    App: register,
    Page: register,
    Component: register,
    setTimeout: (callback, delay) => schedule(callback, delay),
    clearTimeout: cancel,
    setInterval: (callback, delay) => schedule(callback, delay, true),
    clearInterval: cancel
  }
  return { wx, scope, stop }
}
