import type {
  EntitlementsResponse,
  FormalEntitlement,
  LimitedEntitlement
} from '@/shared/contracts/entitlements'
import type {
  LimitedEntitlementDuration,
  LimitedEntitlementState
} from '@/shared/enums/entitlements'

export interface FormalEntitlementViewModel extends FormalEntitlement {
  canOpenContent: boolean
}

export interface LimitedEntitlementViewModel {
  achievements?: LimitedEntitlement['achievements']
  sceneIds: string[]
  status: string
  activatedAt: string | null
  canOpenContent: boolean
  durationDays: LimitedEntitlementDuration
  expiresAt: string | null
  id: string
  keepResults: boolean
  sceneCount: number
  startsBefore: string
  state: LimitedEntitlementState
  title: string
}

export interface EntitlementsViewModel {
  authorizationPending: boolean
  formal: FormalEntitlementViewModel[]
  limited: LimitedEntitlementViewModel[]
}

export interface EntitlementService {
  get(): Promise<EntitlementsResponse>
}
