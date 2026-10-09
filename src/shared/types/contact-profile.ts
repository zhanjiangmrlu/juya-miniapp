import type { ContactCorrection, ContactProfile } from '@/shared/contracts/profile'

export type ValidationResult =
  { error: string; valid: false } | { normalizedWechatId: string; valid: true }

export type CorrectionValidationResult =
  { error: string; valid: false } | { normalizedReason: string; valid: true }

export interface ContactViewModel {
  canSelfEdit: boolean
  selfEditCount: number
  statusLabel: string
  wechatId: string | null
}

export interface ContactService {
  recordPromptExposure(idempotencyKey: string): Promise<{ created: boolean }>
  correct(reason: string): Promise<ContactCorrection>
  get(): Promise<ContactProfile | null>
  remove(): Promise<void>
  save(wechatId: string): Promise<ContactProfile>
}

export type ContactFormInput = {
  consentConfirmed: boolean
  wechatId: string
}
