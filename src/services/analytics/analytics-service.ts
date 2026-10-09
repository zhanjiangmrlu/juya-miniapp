import { sanitizeLaunch } from '@/services/analytics/umeng-driver'
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_VERSION,
  ANALYTICS_EVENT_FIELDS,
  ANALYTICS_SCHEMA_VERSION
} from '@/shared/constants/analytics'
import { AnalyticsConsent } from '@/shared/enums/analytics'

import type { AnalyticsEvent } from '@/shared/enums/analytics'
import type {
  AnalyticsLaunch,
  AnalyticsParams,
  AnalyticsServiceOptions,
  AnalyticsTrackOptions
} from '@/shared/types/analytics'

/** 创建统计状态机，options 为开关、版本、授权存储及隔离 SDK 驱动 */
export const createAnalyticsService = (options: AnalyticsServiceOptions) => {
  let consent: AnalyticsConsent = AnalyticsConsent.UNKNOWN
  let epoch = 0
  let ready = false
  let foreground = true
  let visibleRoute = ''
  let activeRoute = ''
  let latestEntry: AnalyticsLaunch | undefined
  const sent = new Set<string>()
  const listeners = new Set<() => void>()
  try {
    const stored = options.storage.read(ANALYTICS_CONSENT_KEY) as
      { version?: string; state?: AnalyticsConsent } | undefined
    if (
      stored?.version === ANALYTICS_CONSENT_VERSION &&
      [AnalyticsConsent.GRANTED, AnalyticsConsent.DENIED].includes(stored.state as never)
    )
      consent = stored.state!
  } catch {
    /* 缓存异常保持未授权 */
  }

  /** 隔离统计失败，operation 为不影响业务的 SDK 调用 */
  const safely = (operation: () => void) => {
    try {
      operation()
    } catch {
      /* SDK 故障不传播到业务 */
    }
  }
  /** 同步授权状态给当前设置界面 */
  const notify = () => listeners.forEach((listener) => safely(listener))
  /** 开始当前可见页面，仅统计授权生效后的可见区间 */
  const startPage = () => {
    if (!ready || !foreground || !visibleRoute || activeRoute === visibleRoute) return
    activeRoute = visibleRoute
    safely(() => options.driver.pageStart(activeRoute))
  }
  /** 初始化已获同意的驱动，代次防止撤回期间的迟到初始化复活 */
  const start = async () => {
    if (!options.enabled || consent !== AnalyticsConsent.GRANTED || ready) return
    const current = ++epoch
    try {
      await options.driver.start()
      if (current !== epoch || consent !== AnalyticsConsent.GRANTED) return
      ready = true
      if (foreground) safely(() => options.driver.resume(latestEntry))
      startPage()
    } catch {
      if (current === epoch) safely(options.driver.stop)
    }
  }
  /** 保存统计同意，granted 为用户本次明确选择 */
  const setConsent = async (granted: boolean) => {
    epoch++
    ready = false
    activeRoute = ''
    sent.clear()
    safely(options.driver.stop)
    consent = granted ? AnalyticsConsent.GRANTED : AnalyticsConsent.DENIED
    try {
      options.storage.write(ANALYTICS_CONSENT_KEY, {
        version: ANALYTICS_CONSENT_VERSION,
        state: consent
      })
    } catch {
      // 无法可靠保存同意时拒绝启动；撤回仍立即生效
      consent = AnalyticsConsent.DENIED
    }
    notify()
    if (consent === AnalyticsConsent.GRANTED) await start()
  }
  /** 显示路由页面，route 为清单中的静态路由，不含查询参数 */
  const pageShow = (route: string) => {
    if (!/^(?:pages|sub-packages)\/[a-z0-9/-]+$/.test(route)) return
    if (activeRoute && activeRoute !== route) safely(() => options.driver.pageEnd(activeRoute))
    if (activeRoute !== route) activeRoute = ''
    visibleRoute = route
    startPage()
  }
  /** 结束路由页面，route 为隐藏或销毁的页面，只结束一次 */
  const pageHide = (route: string) => {
    if (activeRoute === route) {
      safely(() => options.driver.pageEnd(route))
      activeRoute = ''
    }
    if (visibleRoute === route) visibleRoute = ''
  }
  /** 上报白名单事件，event 为业务事件，params 为受控字段，meta 限制请求授权代次及成功去重 */
  const track = <E extends AnalyticsEvent>(
    event: E,
    params: AnalyticsParams<E> = {},
    meta?: AnalyticsTrackOptions
  ) => {
    if (!ready || !foreground || consent !== AnalyticsConsent.GRANTED) return
    if (meta && 'token' in meta && (meta.token === undefined || meta.token !== epoch)) return
    const allowed = ANALYTICS_EVENT_FIELDS[event] as readonly string[] | undefined
    if (!allowed) return
    const result: Record<string, string> = {
      client_version: options.clientVersion,
      event_schema_version: ANALYTICS_SCHEMA_VERSION
    }
    if (visibleRoute) result.page_code = visibleRoute
    for (const [key, value] of Object.entries(params)) {
      if (!(key === 'page_code' || allowed.includes(key))) return
      if (value === undefined) continue
      if (typeof value !== 'string' || !/^[A-Za-z0-9_/-]{1,96}$/.test(value)) return
      result[key] = value
    }
    const unique = meta?.once ? `${event}:${meta.once}` : undefined
    if (unique && sent.has(unique)) return
    safely(() => {
      options.driver.track(event, result)
      if (unique) sent.add(unique)
    })
  }
  return {
    start,
    setConsent,
    pageShow,
    pageHide,
    track,
    capture: () => (ready && foreground ? epoch : undefined),
    needsPrompt: () => options.enabled && consent === AnalyticsConsent.UNKNOWN,
    getConsent: () => consent,
    isAvailable: () => options.enabled,
    /** 监听授权状态，listener 为界面更新函数 */
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** 恢复当前来源会话，entry 为微信本次进入的场景、路由及来源 */
    appShow: (entry?: AnalyticsLaunch) => {
      foreground = true
      if (entry) latestEntry = sanitizeLaunch(entry)
      if (ready) safely(() => options.driver.resume(latestEntry))
      startPage()
    },
    /** 应用退到后台时结束页面与会话，不重复计算销毁 */
    appHide: () => {
      foreground = false
      if (activeRoute) safely(() => options.driver.pageEnd(activeRoute))
      activeRoute = ''
      if (ready) safely(options.driver.pause)
    }
  }
}
