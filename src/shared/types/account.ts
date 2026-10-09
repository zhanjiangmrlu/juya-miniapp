import type { DeletionRequest } from '@/shared/contracts/account'

export interface AccountService {
  clearLearningData(): Promise<void>
  requestDeletion(): Promise<DeletionRequest>
  revokeDeletion(): Promise<DeletionRequest>
}

export interface DeletionViewModel {
  canRevoke: boolean
  effectiveAt: string
  effectiveLabel: string
  remainingMs: number
  status: DeletionRequest['status']
}

export interface LocalDataScope {
  clearFeedbackDraft(): void
  clearSession(): void
  removeStorage(key: string): void
  resetLearningStores(): void
}

export type AccountLearningHistoryResponse = {
  items: Array<{ scene_id: string; completed_at: string | null }>
}

export type AccountDeletionSummary = { effective_at: string; status: string }
