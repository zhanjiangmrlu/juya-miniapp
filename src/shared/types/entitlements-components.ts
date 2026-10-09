import type { EntitlementPageState } from '@/shared/enums/entitlements'
import type { LimitedEntitlementViewModel } from '@/shared/types/entitlements'

/** EntitlementCard 输入属性 */
export type EntitlementCardProps = { item: LimitedEntitlementViewModel }

/** EntitlementCard 事件契约 */
export type EntitlementCardEmits = {
  open: [item: LimitedEntitlementViewModel]
}

/** EntitlementPageView 输入属性 */
export type EntitlementPageViewProps = {
  state?: LimitedEntitlementViewModel['state'] | EntitlementPageState
  title?: string
}

/** ExpiryNotice 输入属性 */
export type ExpiryNoticeProps = {
  expiresAt: string
  title?: string
}
