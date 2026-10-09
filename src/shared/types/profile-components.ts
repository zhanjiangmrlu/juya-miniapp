import type { ProfileRowSize, ProfileTabKey } from '@/shared/enums/profile'

/** PersonalPage 输入属性 */
export type PersonalPageProps = {
  title: string
  subtitle: string
  navigation?: string
  active?: ProfileTabKey
}

/** PersonalRow 输入属性 */
export type PersonalRowProps = {
  title: string
  detail: string
  badge?: string
  badgeIcon?: string
  size?: ProfileRowSize
  actionable?: boolean
  danger?: boolean
}

/** PersonalRow 事件契约 */
export type PersonalRowEmits = { press: [] }

/** PersonalSummary 输入属性 */
export type PersonalSummaryProps = { label: string; value: string; note: string; compact?: boolean }

/** ProfileActionList 输入属性 */
export type ProfileActionListProps = { unread?: number; feedbackUnread?: number; prompt?: boolean }

/** ProfileActionList 事件契约 */
export type ProfileActionListEmits = {
  account: []
  entitlements: []
  feedback: []
  messages: []
  contact: []
}

/** ProfileIdentity 输入属性 */
export type ProfileIdentityProps = {
  juyaId: string
  wechatLabel: string
  nickname?: string
  avatar?: string | null
}

/** ProfileIdentity 事件契约 */
export type ProfileIdentityEmits = { contact: [] }
