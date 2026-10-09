export const AnalyticsConsent = {
  UNKNOWN: 'unknown',
  GRANTED: 'granted',
  DENIED: 'denied'
} as const
export type AnalyticsConsent = (typeof AnalyticsConsent)[keyof typeof AnalyticsConsent] & string

export const AnalyticsEvent = {
  SCENE_CLICK: 'scene_click',
  ACCESS_NOTICE_VIEW: 'access_notice_view',
  SCENE_OPEN_SUCCESS: 'scene_open_success',
  LEARN_COMPLETE_SUCCESS: 'learn_complete_success',
  AUDIO_PLAY_START: 'audio_play_start',
  ENTRY_POPUP_VIEW: 'entry_popup_view',
  FAVORITE_ADD_SUCCESS: 'favorite_add_success',
  REVIEW_START_SUCCESS: 'review_start_success',
  REVIEW_COMPLETE_SUCCESS: 'review_complete_success',
  ENTITLEMENT_VIEW: 'entitlement_view',
  CONTACT_PROMPT_VIEW: 'contact_prompt_view',
  CONTACT_ENTRY_CLICK: 'contact_entry_click',
  CONTACT_SAVE_SUCCESS: 'contact_save_success'
} as const
export type AnalyticsEvent = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent] & string
