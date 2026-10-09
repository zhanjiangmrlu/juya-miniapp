import type { UserProfile } from '@/shared/contracts/profile'

export interface ProfileService {
  get(): Promise<UserProfile>
}

export type ContactPromptReceipt = { key: string; recorded: boolean }
