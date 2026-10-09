import {
  AccessLevel,
  EntitlementStatus,
  LimitedEntitlementState
} from '@/shared/enums/entitlements'

import type { EntitlementPageState } from '@/shared/enums/entitlements'
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
