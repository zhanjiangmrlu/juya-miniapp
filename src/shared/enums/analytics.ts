export const AnalyticsConsent = {
  UNKNOWN: 'unknown',
  GRANTED: 'granted',
  DENIED: 'denied'
} as const
export type AnalyticsConsent = (typeof AnalyticsConsent)[keyof typeof AnalyticsConsent] & string

export const AnalyticsEvent = {
  /** 用户主动点击场景入口 */
  SCENE_CLICK: 'scene_click',
  /** 未开通内容的访问提示实际显示 */
  ACCESS_NOTICE_VIEW: 'access_notice_view',
  /** 当前页面成功加载完整场景内容，同次访问的后台重验不重复统计 */
  SCENE_OPEN_SUCCESS: 'scene_open_success',
  /** 服务端确认场景学习完成，按本次访问与内容修订去重 */
  LEARN_COMPLETE_SUCCESS: 'learn_complete_success',
  /** 设备回调确认音频开始播放，每次用户发起的播放只统计一次 */
  AUDIO_PLAY_START: 'audio_play_start',
  /** 词汇或语块内容加载成功并打开详情弹层 */
  ENTRY_POPUP_VIEW: 'entry_popup_view',
  /** 服务端确认新增收藏成功 */
  FAVORITE_ADD_SUCCESS: 'favorite_add_success',
  /** 首张有效词卡就绪且服务端复习队列创建成功，按创建幂等键去重 */
  REVIEW_START_SUCCESS: 'review_start_success',
  /** 服务端确认复习完成，按完成幂等键去重 */
  REVIEW_COMPLETE_SUCCESS: 'review_complete_success',
  /** 当前可见权益页成功加载并展示权益信息 */
  ENTITLEMENT_VIEW: 'entitlement_view',
  /** 档案页联系资料提示实际曝光，复用现有曝光键去重 */
  CONTACT_PROMPT_VIEW: 'contact_prompt_view',
  /** 用户主动点击联系资料入口，通过来源属性区分点击位置 */
  CONTACT_ENTRY_CLICK: 'contact_entry_click',
  /** 服务端确认联系资料保存成功，通过来源属性区分填写与修改 */
  CONTACT_SAVE_SUCCESS: 'contact_save_success'
} as const
export type AnalyticsEvent = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent] & string
