import { ConsentAction } from '@/shared/enums/privacy'

export const PRIVACY_STORAGE_PREFIX = 'juya-privacy-v2:'
export const ANALYTICS_POLICY_PAGE_TITLE = '统计与第三方说明'
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

export const CONSENT_ACTION_COPY = {
  [ConsentAction.FULL_AUDIO]: { title: '登录后可播放全文音频', foot: '登录成功后，请再次点击播放' },
  [ConsentAction.PRESET_PRONUNCIATION]: {
    title: '登录后可播放词汇发音',
    foot: '登录成功后，请再次点击发音'
  },
  [ConsentAction.STUDY_NOTE]: {
    title: '登录后可查看学习笔记',
    foot: '登录成功后，请再次点击查看笔记'
  },
  [ConsentAction.STATISTICS]: {
    title: '登录后可选择统计许可',
    foot: '登录成功后，请在隐私说明中再次主动选择；当前统计未运行'
  },
  [ConsentAction.ACCOUNT]: { title: '登录后保存到你的账号', foot: '登录成功后，请再次进行原操作' },
  [ConsentAction.FAVORITE_SCENE]: {
    title: '登录后可收藏这张词汇卡',
    foot: '登录成功后，请再次点击收藏'
  },
  [ConsentAction.FAVORITE_LISTENING]: {
    title: '登录后可收藏这篇听读',
    foot: '登录成功后，请再次点击收藏'
  },
  [ConsentAction.COMPLETE_SCENE]: {
    title: '登录后可保存本次学习',
    foot: '登录成功后，请再次点击完成'
  },
  [ConsentAction.COMPLETE_LISTENING]: {
    title: '登录后可保存本次听读',
    foot: '登录成功后，请再次点击完成'
  }
} as const

// 与API privacy_api.PAGE_PATHS同步，只提供必要页面路径，不携带查询参数
export const CONSENT_PAGE_PATHS = [
  'sub-packages/scenes/detail',
  'sub-packages/account/profile',
  'pages/home/index',
  'sub-packages/account/identity-edit',
  'pages/login/index',
  'pages/favorites/index',
  'sub-packages/feedback/detail',
  'sub-packages/account/policy',
  'sub-packages/account/settings',
  'sub-packages/feedback/create',
  'pages/learning/index',
  'sub-packages/listening/topic',
  'sub-packages/records/index',
  'pages/records/index',
  'sub-packages/feedback/index',
  'sub-packages/listening/article',
  'sub-packages/listening/index',
  'sub-packages/account/contact-edit',
  'pages/profile/index',
  'sub-packages/scenes/image-preview'
] as const
