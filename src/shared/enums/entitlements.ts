/** 限时权益时长，单位为天 */
export type LimitedEntitlementDuration = 3 | 5

/** 限时权益展示状态 */
export type LimitedEntitlementState = 'ACTIVE' | 'ENDED' | 'ENDING' | 'EXCEPTION' | 'PENDING'

/** 场景访问权限等级 */
export type AccessLevel = 'OPEN' | 'FORMAL' | 'LIMITED' | 'PREVIEW' | 'HIDDEN'
