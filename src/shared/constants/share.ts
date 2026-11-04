import { assetInfo, assetUrl } from '@/services/asset-url'
import { ShareChannel } from '@/shared/enums/share'

import type { PageShareCoverAssets } from '@/shared/types/share'
import type { InjectionKey, Ref } from 'vue'

export const PAGE_SHARE_ENTRY_KEY: InjectionKey<Readonly<Ref<boolean>>> = Symbol('page-share-entry')
export const BRAND_SHARE_TITLE = '句芽英语｜在真实场景里学英语'
export const BRAND_SHARE_FRIENDS = '/static/brand/brand-share.png'
export const BRAND_SHARE_TIMELINE = '/static/brand/brand-share-square.png'
export const PAGE_SHARE_TITLE = '句芽英语｜把英语用进生活里'
export const PAGE_SHARE_FRIENDS = '/static/brand/page-share-friends-fallback.jpg'
export const PAGE_SHARE_TIMELINE = '/static/brand/page-share-timeline-fallback.jpg'
export const PAGE_SHARE_ASSET_BASE_URL = (
  import.meta.env.VITE_PAGE_SHARE_ASSET_BASE_URL || ''
).replace(/\/+$/, '')
const friends = assetInfo('brand/page-share-friends.jpg')
const timeline = assetInfo('brand/page-share-timeline.jpg')
export const PAGE_SHARE_COVERS: PageShareCoverAssets = {
  [ShareChannel.FRIENDS]: {
    url: PAGE_SHARE_ASSET_BASE_URL
      ? assetUrl('brand/page-share-friends.jpg', PAGE_SHARE_ASSET_BASE_URL)
      : '',
    file: friends?.file.split('/').pop() || '',
    fallback: PAGE_SHARE_FRIENDS,
    width: friends?.width || 0,
    height: friends?.height || 0,
    bytes: friends?.bytes || 0
  },
  [ShareChannel.TIMELINE]: {
    url: PAGE_SHARE_ASSET_BASE_URL
      ? assetUrl('brand/page-share-timeline.jpg', PAGE_SHARE_ASSET_BASE_URL)
      : '',
    file: timeline?.file.split('/').pop() || '',
    fallback: PAGE_SHARE_TIMELINE,
    width: timeline?.width || 0,
    height: timeline?.height || 0,
    bytes: timeline?.bytes || 0
  }
}
export const PAGE_SHARE_SUMMARY_IMAGE =
  PAGE_SHARE_COVERS[ShareChannel.TIMELINE].url || PAGE_SHARE_TIMELINE
export const PAGE_SHARE_QUERY = 'target=home'
export const PAGE_SHARE_CACHE_PREFIX = 'juya-page-share-'
export const PAGE_SHARE_DOWNLOAD_TIMEOUT_MS = 8000
export const SHARE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/
export const SHARE_DECODE_TIMEOUT_MS = 10000
export const COMPLETE_APP_GUIDANCE =
  '请使用微信页面提供的“打开小程序”入口进入完整小程序；若未显示，可从微信最近使用的小程序中打开句芽英语。'
