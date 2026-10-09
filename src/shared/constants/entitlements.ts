import {
  AccessLevel,
  EntitlementPageState,
  EntitlementStatus,
  LimitedEntitlementState
} from '@/shared/enums/entitlements'

export const ENTITLEMENT_NAVIGATION_LABELS: Record<
  LimitedEntitlementState | EntitlementPageState,
  string
> = {
  [EntitlementPageState.ALL]: '学习权益',
  [LimitedEntitlementState.PENDING]: '限时学习',
  [LimitedEntitlementState.ACTIVE]: '限时学习',
  [LimitedEntitlementState.ENDING]: '限时学习',
  [LimitedEntitlementState.ENDED]: '学习成果',
  [LimitedEntitlementState.EXCEPTION]: '限时学习'
}

export const ENTITLEMENT_EXCEPTION_LABELS: Partial<Record<EntitlementStatus, string>> = {
  [EntitlementStatus.PAUSED]: '已暂停',
  [EntitlementStatus.REVOKED]: '已撤销',
  [EntitlementStatus.START_EXPIRED]: '已过启动截止'
}

export const ENTITLEMENT_DEADLINE_COPY: Partial<
  Record<LimitedEntitlementState, { label: string; note: string }>
> = {
  [LimitedEntitlementState.PENDING]: { label: '启动截止', note: '请在截止前首次打开任一活动场景' },
  [LimitedEntitlementState.ACTIVE]: {
    label: '结束时间',
    note: '按服务端时间计算，进度和收藏会保留'
  },
  [LimitedEntitlementState.ENDING]: { label: '学习权益将于', note: '收藏和学习进度会继续保留。' }
}

export const LIMITED_ENTITLEMENT_ROW_COPY: Record<
  LimitedEntitlementState,
  { detail: string; badge: string }
> = {
  [LimitedEntitlementState.PENDING]: { detail: '待开始', badge: '待开始' },
  [LimitedEntitlementState.ACTIVE]: { detail: '查看状态', badge: '学习中' },
  [LimitedEntitlementState.ENDING]: { detail: '查看状态', badge: '学习中' },
  [LimitedEntitlementState.ENDED]: { detail: '已结束', badge: '已结束' },
  [LimitedEntitlementState.EXCEPTION]: { detail: '查看状态', badge: '暂不可用' }
}
export const LIMITED_ENTITLEMENT_ENDING_WINDOW_MS = 24 * 60 * 60 * 1000

/** 服务端可正常解释的限时权益状态，查询时允许未知字符串 */
export const LIMITED_ENTITLEMENT_STATUS_VALUES: readonly string[] = [
  EntitlementStatus.PENDING,
  EntitlementStatus.ACTIVE,
  EntitlementStatus.ENDED
]

/** 使用成果或异常入口的限时权益展示状态 */
export const LIMITED_ENTITLEMENT_RESULT_STATES: readonly (
  LimitedEntitlementState | EntitlementPageState
)[] = [LimitedEntitlementState.ENDED, LimitedEntitlementState.EXCEPTION]

/** 展示场景列表与精简摘要的限时权益状态 */
export const LIMITED_ENTITLEMENT_CONTENT_STATES: readonly (
  LimitedEntitlementState | EntitlementPageState
)[] = [
  LimitedEntitlementState.PENDING,
  LimitedEntitlementState.ACTIVE,
  LimitedEntitlementState.ENDING
]

/** 可以打开完整学习正文的访问等级 */
export const CONTENT_ACCESS_LEVELS: readonly AccessLevel[] = [
  AccessLevel.OPEN,
  AccessLevel.FORMAL,
  AccessLevel.LIMITED
]
