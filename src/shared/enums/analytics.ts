export const AnalyticsEvent = {
  APP_ENTRY: 'app_entry',
  PAGE_ENTER: 'page_enter',
  PAGE_STAY: 'page_stay',
  AUDIO_PLAY: 'audio_play',
  AUDIO_PAUSE: 'audio_pause',
  AUDIO_SEEK: 'audio_seek',
  AUDIO_RATE_CHANGE: 'audio_rate_change',
  AUDIO_ENDED: 'audio_ended',
  AUDIO_ERROR: 'audio_error',
  LOGIN_PROMPT: 'login_prompt',
  LOGIN_SUCCESS: 'login_success',
  LEARNING_START: 'learning_start',
  LEARNING_COMPLETE: 'learning_complete',
  FAVORITE_CHANGE: 'favorite_change',
  SHARE_TRIGGER: 'share_trigger',
  // #ifdef JUYA_ANALYTICS
  ENTRY_CLICK: 'entry_click',
  CONTENT_CLICK: 'content_click',
  TAB_CHANGE: 'tab_change',
  CATEGORY_SELECT: 'category_select',
  TRANSLATION_TOGGLE: 'translation_toggle',
  DICTIONARY_LOOKUP: 'dictionary_lookup',
  DICTIONARY_SUCCESS: 'dictionary_success',
  IMAGE_OPEN: 'image_open',
  STUDY_NOTE_OPEN: 'study_note_open',
  STUDY_NOTE_READY: 'study_note_ready',
  CONTENT_NEXT: 'content_next',
  CHECKIN_EXPAND: 'checkin_expand',
  FEEDBACK_SUBMIT: 'feedback_submit',
  FEEDBACK_REPLY: 'feedback_reply',
  PROFILE_SAVE: 'profile_save',
  LOGOUT: 'logout',
  BUSINESS_ERROR: 'business_error'
  // #endif
} as const
export type AnalyticsEvent = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent] & string

// #ifdef JUYA_ANALYTICS
export const AnalyticsAction = {
  LOGIN: 'login',
  CONTENT_OPEN: 'content_open',
  FAVORITE_CHANGE: 'favorite_change',
  LEARNING_COMPLETE: 'learning_complete',
  CONTENT_NEXT: 'content_next',
  DICTIONARY_LOOKUP: 'dictionary_lookup',
  IMAGE_OPEN: 'image_open',
  STUDY_NOTE_OPEN: 'study_note_open',
  FEEDBACK_SUBMIT: 'feedback_submit',
  FEEDBACK_REPLY: 'feedback_reply',
  FEEDBACK_UPLOAD: 'feedback_upload',
  PROFILE_SAVE: 'profile_save',
  AVATAR_UPLOAD: 'avatar_upload',
  LOGOUT: 'logout'
} as const
export type AnalyticsAction = (typeof AnalyticsAction)[keyof typeof AnalyticsAction] & string
export const AnalyticsErrorKind = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  CONTENT_UNAVAILABLE: 'content_unavailable',
  CONFLICT: 'conflict',
  RESULT_UNKNOWN: 'result_unknown',
  PLATFORM: 'platform',
  OTHER: 'other'
} as const
export type AnalyticsErrorKind = (typeof AnalyticsErrorKind)[keyof typeof AnalyticsErrorKind] &
  string
export const AnalyticsStage = {
  VALIDATION: 'validation',
  REQUEST: 'request',
  DOWNLOAD: 'download',
  OPEN: 'open',
  UPLOAD: 'upload'
} as const
export type AnalyticsStage = (typeof AnalyticsStage)[keyof typeof AnalyticsStage] & string
// #endif
