import type { AccountProfile } from './account'
export type ContactBaseline = Pick<AccountProfile, 'phone' | 'wechat_contact' | 'contact_version'>
export interface ContactInput {
  phone: string
  wechat_contact: string
}
export interface IdentityInput {
  nickname: string
  avatar_id: string | null
}
