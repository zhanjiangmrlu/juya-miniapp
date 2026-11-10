import { ref } from 'vue'

import { createAnalyticsEvents } from '@/services/analytics-events'
import { createAnalyticsNative } from '@/services/analytics-native'
import { CONSENT_EVENT_NAMES } from '@/shared/constants/privacy'

import type {
  AnalyticsConfigurePorts,
  AnalyticsPorts,
  AnalyticsProperties,
  AnalyticsRuntimeContext,
  AnalyticsSDK,
  AnalyticsSDKFactory
} from '@/shared/types/analytics'

/** 生成事件 UUID，不编码业务账号、登录票据或用户输入 */
const eventKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16)
    return (char === 'x' ? value : (value & 3) | 8).toString(16)
  })
/** 从业务路由中移除查询和片段；value 为当前内部页面路径 */
const pagePath = (value: string) => value.split(/[?#]/)[0]?.replace(/^\/+/, '') || ''

/** 绑定可信账号与服务器许可，为每个代际创建独立 SDK 并先鉴权手工事件
 * @param ports 测试构建配置、SDK 工厂及微信能力读取端口
 */
export const createAnalyticsService = (ports: AnalyticsPorts) => {
  const running = ref(false)
  let integration: AnalyticsConfigurePorts | undefined
  let factory = ports.createSDK
  let visible = false,
    scene = 0,
    foregroundRevision = 0
  type Generation = {
    context: AnalyticsRuntimeContext
    sdk?: AnalyticsSDK
    native: ReturnType<typeof createAnalyticsNative>
    events: ReturnType<typeof createAnalyticsEvents>
    finish: (ready: boolean) => void
    ready: Promise<boolean>
    operations: Set<string>
    page: string
  }
  let current: Generation | undefined
  /** 只有显式配置的微信测试构建可以接通 SDK */
  const available =
    ports.config.enabled && ports.config.environment === 'test' && !!ports.config.appKey
  /** 读取当前可信上下文，读取失败时关闭 */
  const context = () => {
    try {
      return integration?.context()
    } catch {
      return undefined
    }
  }
  /** 账号、许可、协议与构建配置全部有效才可初始化；value 为当前可信快照 */
  const permitted = (value?: AnalyticsRuntimeContext) =>
    !!(
      available &&
      value?.owner &&
      value.enabled &&
      value.policiesReady &&
      value.scopeVersion &&
      Number.isInteger(value.revision) &&
      value.revision > 0
    )
  /** 判断异步任务仍属于当前账号和许可；generation 为捕获时的代际 */
  const active = (generation: Generation) => {
    const value = context()
    return (
      current === generation &&
      permitted(value) &&
      value?.owner === generation.context.owner &&
      value.revision === generation.context.revision &&
      value.scopeVersion === generation.context.scopeVersion
    )
  }
  /** 先废弃代际，再取消全部请求、定时器、回调和队列，不调用 pause 补传 */
  const stop = () => {
    const generation = current
    current = undefined
    running.value = false
    if (!generation) return
    generation.events.clear()
    generation.operations.clear()
    generation.finish(false)
    generation.native.stop()
    generation.sdk = undefined
  }
  /** 同步可信身份与许可，变化时创建全新 SDK/内存存储，不恢复历史 UUID 或队列 */
  const sync = () => {
    const value = context()
    if (current && !active(current)) stop()
    if (current || !permitted(value) || !factory || !value || !integration) return
    let finish!: (ready: boolean) => void
    const ready = new Promise<boolean>((resolve) => {
      finish = resolve
    })
    const generation = {
      context: { ...value },
      finish,
      ready,
      operations: new Set<string>(),
      page: ''
    } as Generation
    generation.native = createAnalyticsNative({
      native: ports.native || (() => ({})),
      owner: value.owner!,
      hasConsent: () => active(generation)
    })
    generation.events = createAnalyticsEvents({
      context: () => ({
        owner: value.owner,
        revision: value.revision,
        enabled: active(generation) && visible
      }),
      key: ports.key || eventKey,
      now: ports.now,
      /** 后端逐事件验证账号与许可后才上报；event 为最小规范化事件 */
      send: async (event) => {
        if (!active(generation) || !visible) return
        const interval = foregroundRevision
        try {
          await integration!.authorize(event)
        } catch {
          if (current === generation) stop()
          return
        }
        if (
          !(await generation.ready) ||
          !active(generation) ||
          !visible ||
          interval !== foregroundRevision ||
          !generation.sdk
        )
          return
        if (event.event === 'page_enter') {
          const route = String(event.properties.page_path || '')
          if (route && route !== generation.page) {
            if (generation.page) generation.sdk.trackPageEnd(generation.page)
            generation.page = route
            generation.sdk.trackPageStart(route)
          }
        }
        generation.sdk.trackEvent(event.event, {
          ...event.properties,
          event_id: event.event_id,
          occurred_at: event.occurred_at,
          consent_revision: event.consent_revision
        })
      }
    })
    current = generation
    try {
      const sdk = factory(generation.native.scope)
      generation.sdk = sdk
      sdk.messager?.once(sdk.messager.messageType.UMA_LIB_INITED, () => {
        if (!active(generation)) return
        sdk.setUserid?.(value.owner)
        running.value = true
        finish(true)
        if (visible) sdk.resume({ scene })
      })
      sdk.init({
        appKey: ports.config.appKey,
        useOpenid: false,
        autoGetOpenid: false,
        uploadUserInfo: false,
        enableVerify: false,
        debug: false
      })
    } catch {
      stop()
    }
  }
  /** 配置可信状态和后端授权边界，不静态依赖会话或隐私服务；value 为应用提供的接入端口 */
  const configure = (value: AnalyticsConfigurePorts) => {
    stop()
    integration = value
    sync()
  }
  /** 安装可重复创建的官方 SDK 工厂；value 为构建注入的私有作用域工厂 */
  const attach = (value: AnalyticsSDKFactory) => {
    stop()
    factory = value
    sync()
  }
  /** 只接受五类明确成功事件，统计失败不影响业务；event 为事件名，properties 为必要引用，operationKey 为已确认回执 */
  const track = async (
    event: string,
    properties: AnalyticsProperties = {},
    operationKey?: string
  ) => {
    if (!CONSENT_EVENT_NAMES.includes(event as (typeof CONSENT_EVENT_NAMES)[number])) return
    sync()
    const generation = current
    if (!generation || !active(generation) || !visible) return
    const dedupe = operationKey ? `${event}:${operationKey}` : ''
    if (dedupe && generation.operations.has(dedupe)) return
    if (dedupe) generation.operations.add(dedupe)
    try {
      const route =
        properties.page_path || (event === 'page_enter' ? integration?.currentPage() : '')
      await generation.events.track(
        event,
        { ...properties, ...(route ? { page_path: pagePath(route) } : {}) },
        operationKey
      )
    } catch {
      /* 统计不可用不改变业务结果 */
    }
  }
  /** 进入前台只保留数字场景；options 为微信入口参数，忽略查询和来源对象 */
  const foreground = (options: { scene?: unknown; [key: string]: unknown } = {}) => {
    visible = true
    scene = typeof options.scene === 'number' ? options.scene : 0
    sync()
    if (current && active(current) && running.value) {
      current.sdk?.resume({ scene })
      void current.events.flush()
    }
  }
  /** 当前许可有效时结算会话；后台不接受迟到手工事件 */
  const background = () => {
    const generation = current
    visible = false
    foregroundRevision++
    if (!generation) return
    generation.events.clear()
    if (!active(generation)) {
      stop()
      return
    }
    try {
      if (generation.page) generation.sdk?.trackPageEnd(generation.page)
      generation.page = ''
      generation.sdk?.pause()
    } catch {
      /* SDK 故障不阻塞切后台 */
    }
  }
  /** 旧账号布尔通知只能关闭当前实例，不能作为可信账号或许可开启凭证；value 表示旧端口身份是否存在 */
  const setAuthenticated = (value: boolean) => {
    if (!value) stop()
  }
  /** 旧许可端口只能即时停止；agreed 为旧调用方本地选择，开启必须经可信 configure 上下文 */
  const setConsent = (agreed: boolean) => {
    if (!agreed) stop()
  }
  return {
    available,
    configure,
    attach,
    sync,
    stop,
    track,
    foreground,
    background,
    setAuthenticated,
    setConsent,
    choice: () => context()?.enabled === true,
    hasConsent: () => !!current && active(current),
    get running() {
      return !!current && active(current) && running.value
    }
  }
}
