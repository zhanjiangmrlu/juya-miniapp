export const PRIVACY_STORAGE_PREFIX = 'juya-privacy-v2:'
export const PRIVACY_SOURCE = {
  FIRST: 'first_launch',
  ACTION: 'account_action',
  LOGIN: 'login_page'
} as const
export const CONSENT_EVENT_NAMES = [
  'page_enter',
  'content_open',
  'audio_play',
  'favorite_change',
  'learning_complete'
] as const
export const CONSENT_EVENT_PROPERTIES = [
  'page_path',
  'content_type',
  'content_id',
  'version_id',
  'audio_kind',
  'favorite'
] as const
