import type { FeedbackUploadCredential } from '@/shared/contracts/feedback'
import type { UserProfile } from '@/shared/contracts/profile'

export interface ProfileService {
  get(): Promise<UserProfile>
  update(payload: {
    nickname: string | null
    avatar_object_key: string | null
  }): Promise<UserProfile>
  getAvatarCredential(contentType: string): Promise<FeedbackUploadCredential>
}

export type ContactPromptReceipt = { key: string; recorded: boolean }
