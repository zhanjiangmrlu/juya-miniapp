import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_GATE_METHODS,
  ANALYTICS_POLICY_VERSION,
  ANALYTICS_PROD_CONSENT_KEY,
  ANALYTICS_PROPERTY_KEYS
} from '@/shared/constants/analytics'
import { AnalyticsEvent } from '@/shared/enums/analytics'

import type {
  AnalyticsMethod,
  AnalyticsPageVisit,
  AnalyticsPorts,
  AnalyticsProperties,
  AnalyticsSDK,
  PendingAnalyticsEvent
} from '@/shared/types/analytics'

/** 管理独立统计授权与 SDK 生命周期，SDK 失败不影响学习
 * @param ports 当前构建配置、本地存储和可见页面读取端口
 */
export const createAnalyticsService = (ports: AnalyticsPorts) => {
  let sdk: AnalyticsSDK | undefined,
    consent: boolean | undefined,
    ready = false,
    initialized = false,
    visible = false,
    authenticated = false,
    scene = 0
  const confirmed = new Set<string>()
  const pending: PendingAnalyticsEvent[] = []
  let pageVisit: AnalyticsPageVisit | undefined
  const now = ports.now || Date.now
  const consentKey =
    ports.config.environment === 'production' ? ANALYTICS_PROD_CONSENT_KEY : ANALYTICS_CONSENT_KEY
  /** 读取当前政策版本的独立统计选择，读取失败保持关闭 */
  const choice = () => {
    if (!ports.config.enabled) return undefined
    if (consent !== undefined) return consent
    try {
      const saved = ports.storage.get(consentKey) as
        { version?: string; agreed?: boolean } | undefined
      if (saved?.version === ANALYTICS_POLICY_VERSION && typeof saved.agreed === 'boolean')
        consent = saved.agreed
    } catch {
      /* 无法读取授权时不启动 */
    }
    return consent
  }
  /** 初始化及原生异步回调只允许在当前授权和平台模式下继续 */
  const hasConsent = () =>
    ports.config.enabled && ports.isPermitted?.() !== false && choice() === true
  /** 返回当前可否发送新事件 */
  const allowed = () =>
    ports.config.enabled && ports.isPermitted?.() !== false && choice() === true && ready
  /** 过滤事件维度，不将完整路由和个人输入交给 SDK
   * @param event 白名单业务事件
   * @param properties 已确认的非敏感业务维度
   * @param operationKey 同一业务操作的本地去重标识，不上传友盟
   */
  const track = (
    event: AnalyticsEvent,
    properties: AnalyticsProperties = {},
    operationKey?: string
  ) => {
    if (
      !visible ||
      !ports.config.enabled ||
      ports.isPermitted?.() === false ||
      choice() !== true ||
      !sdk
    )
      return
    const dedupe = operationKey ? `${event}:${operationKey}` : ''
    if (dedupe && confirmed.has(dedupe)) return
    const safe: Record<string, string | number> = {
      auth_state: authenticated ? 'logged_in' : 'guest',
      environment: ports.config.environment
    }
    for (const key of ANALYTICS_PROPERTY_KEYS) {
      const value = properties[key]
      if (
        (typeof value === 'string' && value.length <= 128) ||
        (typeof value === 'number' && Number.isFinite(value))
      )
        safe[key] = value
    }
    if (!ready) {
      if (initialized && pending.length < 25)
        pending.push({ event, properties: safe as AnalyticsProperties, operationKey })
      return
    }
    try {
      sdk.trackEvent(event, safe)
      if (dedupe) {
        confirmed.add(dedupe)
        if (confirmed.size > 1000) confirmed.delete(confirmed.values().next().value || '')
      }
    } catch {
      /* 统计不可用时保留业务成功结果 */
    }
  }
  /** 仅结算当前已授权前台区间，多次隐藏或卸载不重复计算 */
  const endPage = () => {
    const visit = pageVisit
    pageVisit = undefined
    if (!visit) return
    track(AnalyticsEvent.PAGE_STAY, {
      ...visit.properties,
      duration_ms: Math.max(0, now() - visit.started)
    })
  }
  /** 从当前前台开始一次页面访问，保留离开时仍能定位的安全业务维度
   * @param route 不含 query 的页面路径
   */
  const enterPage = (route: string) => {
    if (!visible || pageVisit?.route === route || !route) return
    endPage()
    const properties = { ...ports.pageProperties?.(), page_path: route }
    pageVisit = { route, properties, started: now() }
    track(AnalyticsEvent.PAGE_ENTER, properties)
  }
  /** 授权或 SDK 就绪后仅从当前可见页面开始，不补传历史页面 */
  const activate = () => {
    if (!allowed() || !visible || !sdk) return
    try {
      sdk.resume({ scene })
      const route = ports.currentPage().split('?')[0] || ''
      if (route) sdk.trackPageStart(route)
    } catch {
      /* 原生环境不可用时不阻塞页面 */
    }
    track(AnalyticsEvent.APP_ENTRY)
  }
  /** 初始化一次已获得授权的测试 SDK */
  const start = () => {
    if (
      !ports.config.enabled ||
      ports.isPermitted?.() === false ||
      choice() !== true ||
      !sdk ||
      initialized
    )
      return
    initialized = true
    try {
      sdk.init({
        appKey: ports.config.appKey,
        useOpenid: false,
        autoGetOpenid: false,
        uploadUserInfo: false,
        enableVerify: false,
        debug: false
      })
    } catch {
      /* 本次初始化失败后不在业务流程中反复重试 */
    }
  }
  /** 在 App 注册前安装门禁，SDK 重新赋值 API 时仍保留授权检查
   * @param instance 官方 SDK 导出的单例对象
   */
  const attach = (instance: AnalyticsSDK) => {
    if (!ports.config.enabled || sdk) return
    sdk = instance
    for (const method of ANALYTICS_GATE_METHODS) {
      let implementation = instance[method] as AnalyticsMethod | undefined
      /** 仅已授权且就绪的方法可以进入 SDK，阻止内部启动前队列
       * @param args SDK 生命周期或事件原始参数
       */
      const guarded = (...args: unknown[]) => {
        if (method === 'trackShare') return args[0]
        if (method.startsWith('set')) return undefined
        if (method === 'init') {
          if (!initialized || choice() !== true || !args[0]) return undefined
        } else if (!allowed()) {
          if (method === 'trackPageStart' || method === 'trackPageEnd') pageVisit = undefined
          return undefined
        }
        if (method === 'resume') {
          const entry = args[0]
          if (
            entry &&
            typeof entry === 'object' &&
            'scene' in entry &&
            typeof entry.scene === 'number'
          )
            scene = entry.scene
          args = [{ scene }]
        }
        if (
          (method === 'trackPageStart' || method === 'trackPageEnd') &&
          typeof args[0] === 'string'
        )
          args = [args[0].split('?')[0]]
        try {
          if (method === 'trackPageStart') {
            if (!visible) return undefined
            enterPage(String(args[0] || ''))
          }
          if (method === 'pause' || (method === 'trackPageEnd' && args[0] === pageVisit?.route))
            endPage()
          return implementation?.apply(instance, args)
        } catch {
          return undefined
        }
      }
      Object.defineProperty(instance, method, {
        configurable: true,
        enumerable: true,
        get: () => guarded,
        set: (value: AnalyticsMethod) => {
          implementation = value
        }
      })
    }
    instance.messager?.once(instance.messager.messageType.UMA_LIB_INITED, () => {
      ready = true
      activate()
      for (const value of pending.splice(0))
        track(value.event, value.properties, value.operationKey)
    })
    start()
  }
  /** 保存用户独立选择，保存失败不启用统计
   * @param agreed 用户本次明确选择是否同意统计
   */
  const setConsent = (agreed: boolean) => {
    if (!ports.config.enabled) return
    if (!agreed) {
      if (allowed() && sdk) {
        try {
          sdk.trackPageEnd(ports.currentPage().split('?')[0] || '')
          sdk.pause()
        } catch {
          /* 关闭统计不依赖上次数据能否发送 */
        }
      }
      consent = false
      pageVisit = undefined
      pending.length = 0
    }
    try {
      ports.storage.set(consentKey, { version: ANALYTICS_POLICY_VERSION, agreed })
      consent = agreed
      ports.onConsentChanged?.(agreed)
    } catch {
      consent = false
      pageVisit = undefined
      ports.onConsentChanged?.(false)
      return
    }
    if (agreed) {
      const wasInitialized = initialized
      start()
      if (wasInitialized) activate()
    }
  }
  /** 前台访问只记录当前场景值，不保留 query 中的身份或票据
   * @param options 微信前台入口，仅读取数值场景
   */
  const foreground = (options: { scene?: unknown; [key: string]: unknown } = {}) => {
    const wasVisible = visible
    visible = true
    scene = typeof options.scene === 'number' ? options.scene : 0
    const wasInitialized = initialized
    if (hasConsent()) ports.onConsentChanged?.(true)
    start()
    if (!wasVisible && wasInitialized && allowed()) track(AnalyticsEvent.APP_ENTRY)
  }
  /** 页面进入后台后不再接收迟到业务回调 */
  const background = () => {
    endPage()
    visible = false
    pending.length = 0
  }
  /** 更新登录状态维度，不接收或上报账号编号
   * @param value 当前客户端是否具有已恢复的业务身份
   */
  const setAuthenticated = (value: boolean) => {
    authenticated = value
  }
  return {
    available: ports.config.enabled,
    attach,
    track,
    setConsent,
    foreground,
    background,
    setAuthenticated,
    choice,
    hasConsent
  }
}
