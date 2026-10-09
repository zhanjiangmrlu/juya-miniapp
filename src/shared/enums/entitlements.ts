/** 限时权益时长，单位为天 */
export const LimitedEntitlementDuration = {
  THREE_DAYS: 3,
  FIVE_DAYS: 5
} as const

export type LimitedEntitlementDuration =
  (typeof LimitedEntitlementDuration)[keyof typeof LimitedEntitlementDuration] & number

/** 限时权益展示状态 */
export const LimitedEntitlementState = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  ENDING: 'ENDING',
  EXCEPTION: 'EXCEPTION',
  PENDING: 'PENDING'
} as const

export type LimitedEntitlementState =
  (typeof LimitedEntitlementState)[keyof typeof LimitedEntitlementState] & string

/** 场景访问权限等级 */
export const AccessLevel = {
  OPEN: 'OPEN',
  FORMAL: 'FORMAL',
  LIMITED: 'LIMITED',
  PREVIEW: 'PREVIEW',
  HIDDEN: 'HIDDEN'
} as const

export type AccessLevel = (typeof AccessLevel)[keyof typeof AccessLevel] & string

/** 前端已识别的服务端权益状态，接口字段继续允许未知字符串 */
export const EntitlementStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  PAUSED: 'PAUSED',
  REVOKED: 'REVOKED',
  START_EXPIRED: 'START_EXPIRED'
} as const

export type EntitlementStatus = (typeof EntitlementStatus)[keyof typeof EntitlementStatus] & string

/** 权益页面聚合视图 */
export const EntitlementPageState = {
  ALL: 'ALL'
} as const

export type EntitlementPageState =
  (typeof EntitlementPageState)[keyof typeof EntitlementPageState] & string
