export const ANALYTICS_CONSENT_KEY = 'juya-analytics-test-consent-v1'
export const ANALYTICS_PROD_CONSENT_KEY = 'juya-analytics-prod-consent-v1'
export const ANALYTICS_POLICY_VERSION = '2026-11-09'
export const ANALYTICS_PROPERTY_KEYS = [
  'content_type',
  'content_id',
  'entry_source',
  'auth_state',
  'favorite',
  'channel',
  'page_path',
  'duration_ms',
  'version_id',
  'audio_kind',
  'word_id',
  'position_s',
  'audio_duration_s',
  'playback_rate',
  'trigger',
  'target_page',
  'tab_id',
  'category_id',
  'expanded',
  'action',
  'stage',
  'error_kind'
] as const
export const ANALYTICS_GATE_METHODS = [
  'init',
  'resume',
  'pause',
  'trackEvent',
  'trackPageStart',
  'trackPageEnd',
  'trackShare',
  'setUserid',
  'setOpenid',
  'setUnionid',
  'setUserInfo',
  'setSuperProperty'
] as const
export const ANALYTICS_POLICY_URL = 'https://www.umeng.com/page/policy'
