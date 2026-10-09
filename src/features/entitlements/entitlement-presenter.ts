import { LIMITED_ENTITLEMENT_ENDING_WINDOW_MS as ENDING_WINDOW } from '@/shared/constants/entitlements'

import type { EntitlementsResponse, LimitedEntitlement } from '@/shared/contracts/entitlements'
import type {
  EntitlementsViewModel,
  LimitedEntitlementViewModel
} from '@/shared/types/entitlements'
import type { ServerClock } from '@/shared/types/time'

export type { FormalEntitlementViewModel } from '@/shared/types/entitlements'
export type { LimitedEntitlementViewModel } from '@/shared/types/entitlements'
export type { EntitlementsViewModel } from '@/shared/types/entitlements'

/** 按服务端绝对时间映射限时权益状态，不在客户端创建激活时间 */
const presentLimited = (
  item: LimitedEntitlement,
  clock: ServerClock,
  authorizationPending: boolean
): LimitedEntitlementViewModel => {
  let state: LimitedEntitlementViewModel['state'] = 'PENDING'

  if (authorizationPending || !['PENDING', 'ACTIVE', 'ENDED'].includes(item.status))
    state = 'EXCEPTION'
  else if (!item.activated_at && clock.remainingUntil(item.starts_before) === 0) state = 'EXCEPTION'
  else if (
    item.status === 'ENDED' ||
    (item.expires_at && clock.remainingUntil(item.expires_at) === 0)
  )
    state = 'ENDED'
  else if (item.activated_at && item.expires_at) {
    state = clock.remainingUntil(item.expires_at) <= ENDING_WINDOW ? 'ENDING' : 'ACTIVE'
  }

  return {
    achievements: item.achievements,
    sceneIds: item.scene_ids ?? [],
    status: item.status,
    activatedAt: item.activated_at,
    canOpenContent: !authorizationPending && (state === 'ACTIVE' || state === 'ENDING'),
    durationDays: item.duration_days,
    expiresAt: item.expires_at,
    id: item.id,
    keepResults: state === 'ENDED',
    sceneCount: item.scene_count,
    startsBefore: item.starts_before,
    state,
    title: item.title
  }
}

/** 映射正式与限时权益并存状态，授权待确认时收紧全部正文访问 */
export const presentEntitlements = (
  dto: EntitlementsResponse,
  clock: ServerClock
): EntitlementsViewModel => {
  return {
    authorizationPending: dto.authorization_pending,
    formal: dto.formal.map((item) => ({
      ...item,
      canOpenContent:
        !dto.authorization_pending &&
        item.status === 'ACTIVE' &&
        Date.parse(item.effective_at) <= clock.now().getTime() &&
        (!item.expires_at || clock.remainingUntil(item.expires_at) > 0)
    })),
    limited: dto.limited.map((item) => presentLimited(item, clock, dto.authorization_pending))
  }
}
