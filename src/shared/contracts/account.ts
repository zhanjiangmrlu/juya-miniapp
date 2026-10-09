import type { AccountDeletionStatus } from '@/shared/enums/account'

export interface DeletionRequest {
  completed_at: string | null
  effective_at: string
  id: string
  requested_at: string
  revoked_at: string | null
  status: AccountDeletionStatus
}
