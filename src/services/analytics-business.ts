import { analytics } from '@/services/analytics'
import { ApiError } from '@/services/errors'
import { AnalyticsErrorKind, AnalyticsEvent, AnalyticsStage } from '@/shared/enums/analytics'

import type { AnalyticsAction } from '@/shared/enums/analytics'
import type { AnalyticsProperties } from '@/shared/types/analytics'

/** 路由统计只保留页面路径
 * @param value 页面路径或内部跳转地址
 */
const routePath = (value: string) => value.split(/[?#]/)[0]!.replace(/^\/+/, '')

/** 将有限业务维度送入既有授权门禁，统计失败不影响交互
 * @param event 固定业务事件
 * @param properties 不含私人输入的白名单维度
 */
const track = (event: AnalyticsEvent, properties: AnalyticsProperties = {}) => {
  try {
    const route =
      typeof getCurrentPages === 'undefined' ? '' : getCurrentPages().at(-1)?.route || ''
    analytics.track(event, {
      ...(route ? { page_path: routePath(route) } : {}),
      ...properties,
      ...(properties.target_page ? { target_page: routePath(properties.target_page) } : {})
    })
  } catch {
    /* 观察失败不改变用户操作 */
  }
}

/** 固定分类异常，不把原始错误文案、接口或字段上传
 * @param reason 本次明确用户操作的失败原因
 */
const errorKind = (reason: unknown): AnalyticsErrorKind | undefined => {
  if (reason instanceof ApiError) {
    if (['session_changed', 'browse_only'].includes(reason.code)) return undefined
    if (
      [
        'network_unknown',
        'response_unknown',
        'operation_pending',
        'operation_unknown',
        'operation_conflict'
      ].includes(reason.code)
    )
      return AnalyticsErrorKind.RESULT_UNKNOWN
    if (reason.status === 401 || reason.code === 'unauthenticated')
      return AnalyticsErrorKind.UNAUTHENTICATED
    if (
      [
        'learning_authorization_required',
        'lookup_authorization_required',
        'listening_locked'
      ].includes(reason.code) ||
      reason.status === 403
    )
      return AnalyticsErrorKind.FORBIDDEN
    if ([404, 410].includes(reason.status)) return AnalyticsErrorKind.CONTENT_UNAVAILABLE
    if (reason.status === 409) return AnalyticsErrorKind.CONFLICT
    if ([400, 422].includes(reason.status)) return AnalyticsErrorKind.VALIDATION
    if (
      reason.code.includes('network') ||
      reason.status >= 500 ||
      [408, 429].includes(reason.status)
    )
      return AnalyticsErrorKind.NETWORK
  }
  const message = (reason as { errMsg?: unknown } | undefined)?.errMsg
  if (typeof message === 'string') {
    if (/:fail\s+cancel\b/i.test(message)) return undefined
    return AnalyticsErrorKind.PLATFORM
  }
  return AnalyticsErrorKind.OTHER
}

/** 记录当前用户操作的失败或拦截，不参与任何重试和业务返回
 * @param action 固定业务动作
 * @param reason 已由业务捕获的错误
 * @param properties 当前内容的有限维度
 * @param stage 本次失败发生的固定阶段
 */
const error = (
  action: AnalyticsAction,
  reason: unknown,
  properties: AnalyticsProperties = {},
  stage: AnalyticsStage = AnalyticsStage.REQUEST
) => {
  try {
    const kind = errorKind(reason)
    if (kind)
      track(AnalyticsEvent.BUSINESS_ERROR, {
        ...properties,
        action,
        stage,
        error_kind:
          kind === AnalyticsErrorKind.OTHER && stage === AnalyticsStage.OPEN
            ? AnalyticsErrorKind.PLATFORM
            : kind
      })
  } catch {
    /* 统计分类失败不改变业务错误 */
  }
}

/** 记录主要入口点击，不记录启动参数
 * @param source 固定的入口标识
 * @param target 内部目标页面
 */
const entry = (source: string, target: string) =>
  track(AnalyticsEvent.ENTRY_CLICK, { entry_source: source, target_page: target })

export const businessAnalytics = { track, error, entry }
