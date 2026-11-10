import { ConsentAction } from '@/shared/enums/privacy'

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

export const CONSENT_ACTION_COPY = {
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
