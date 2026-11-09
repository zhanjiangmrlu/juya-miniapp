import type { AnalyticsMethod, AnalyticsNativePorts } from '@/shared/types/analytics'

/** 为友盟提供独立微信接口作用域，不替换业务使用的全局 wx
 * @param ports 原生接口读取、当前统计授权及SDK存储命名空间
 */
export const createAnalyticsNative = (ports: AnalyticsNativePorts) => {
  const deferred: (() => void)[] = []
  const requests = new Set<{ abort: () => void }>()
  const methods = new Map<string, AnalyticsMethod>()
  /** 执行先前已获授权调用的回调；撤回期间暂停后续初始化链
   * @param callback SDK 原生操作的回调
   * @param values 该次已发起操作返回的结果
   */
  const deliver = (callback: AnalyticsMethod, values: unknown[]) => {
    if (ports.hasConsent()) callback(...values)
    else if (deferred.length < 100) deferred.push(() => deliver(callback, values))
  }
  const wx = new Proxy<Record<string, unknown>>(
    {},
    {
      get: (target, name: string) => {
        if (name in target) return target[name]
        const native = ports.native(),
          value = native[name]
        if (typeof value !== 'function') return value
        if (!methods.has(name)) {
          /** 原生调用与异步回调都重新检查授权，不允许 SDK 内部任务绕过
           * @param args SDK 传入的原生接口参数
           */
          const guarded = (...args: unknown[]) => {
            if (!ports.hasConsent()) return undefined
            const input = args[0]
            const storage =
              ports.storageNamespace && /^(?:get|set|remove)Storage(?:Sync)?$/.test(name)
            if (input && typeof input === 'object') {
              const options = { ...input } as Record<string, unknown>
              if (storage && typeof options.key === 'string')
                options.key = ports.storageNamespace + options.key
              for (const key of ['success', 'fail', 'complete']) {
                const callback = options[key]
                if (typeof callback === 'function')
                  options[key] = (...values: unknown[]) =>
                    deliver(callback as AnalyticsMethod, values)
              }
              args[0] = options
            } else if (storage && typeof input === 'string') {
              args[0] = ports.storageNamespace + input
            } else if (typeof input === 'function') {
              args[0] = (...values: unknown[]) => {
                if (ports.hasConsent()) (input as AnalyticsMethod)(...values)
              }
            }
            const result = value.apply(native, args) as { abort?: () => void } | undefined
            if (name === 'getLaunchOptionsSync') {
              const scene = result && 'scene' in result ? result.scene : undefined
              return typeof scene === 'number' ? { scene } : {}
            }
            if (name === 'request' && typeof result?.abort === 'function') {
              requests.add(result as { abort: () => void })
              if (requests.size > 100) requests.delete(requests.values().next().value!)
            }
            return result
          }
          methods.set(name, guarded)
        }
        return methods.get(name)
      }
    }
  )
  /** 再次同意后继续未完成的初始化；不排队未获授权的新原生调用 */
  const resume = () => {
    if (!ports.hasConsent()) return
    for (const callback of deferred.splice(0)) callback()
  }
  /** 撤回后终止友盟作用域内尚未完成的网络请求 */
  const stop = () => {
    for (const task of requests) {
      try {
        task.abort()
      } catch {
        /* 原生请求可能已经结束 */
      }
    }
    requests.clear()
  }
  return { wx, resume, stop }
}
