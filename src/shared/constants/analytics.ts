export const ANALYTICS_CONSENT_KEY = 'juya.analytics.consent'
export const ANALYTICS_CONSENT_VERSION = '1'
export const ANALYTICS_SCHEMA_VERSION = '1'
export const ANALYTICS_STORAGE_PREFIX = 'juya.analytics.sdk.'
export const ANALYTICS_ENDPOINTS = ['umini.shujupie.com', 'ulogs.umeng.com']
export const ANALYTICS_EVENT_FIELDS = {
  scene_click: ['content_scene_id', 'access_level', 'entry_source'],
  access_notice_view: ['content_scene_id', 'access_level', 'entry_source'],
  scene_open_success: ['content_scene_id', 'content_revision_id', 'access_level'],
  learn_complete_success: ['content_scene_id', 'content_revision_id'],
  audio_play_start: ['content_scene_id', 'content_revision_id', 'entry_type'],
  entry_popup_view: ['content_scene_id', 'content_revision_id', 'entry_type'],
  favorite_add_success: ['content_scene_id', 'content_revision_id', 'entry_type'],
  review_start_success: ['entry_type'],
  review_complete_success: ['entry_type'],
  entitlement_view: ['access_level'],
  contact_prompt_view: ['entry_source'],
  contact_entry_click: ['entry_source'],
  contact_save_success: ['entry_source']
} as const
export const ANALYTICS_NOTICE =
  '我们希望通过友盟小程序统计了解访问来源、页面浏览和学习功能使用情况，以改进句芽。开启后会处理随机统计标识、设备与网络基础信息及使用行为，不上传微信号、昵称、头像或学习录音。你可以暂不开启，继续使用全部现有功能，也可在「我的学习档案 → 数据与账号」随时关闭。'
