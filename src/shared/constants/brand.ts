import { assetUrl } from '@/services/asset-url'

import { STATIC_ASSET_BASE_URL } from './assets'
import { HOME_BACKGROUND_FILE } from './ui'

export { STATIC_ASSET_BASE_URL } from './assets'
export const LOGIN_BOTANICAL_IMAGE_URL = STATIC_ASSET_BASE_URL
  ? assetUrl('brand/u00-botanical-watercolor@3x.png')
  : ''
export const HOME_BACKGROUND_IMAGE_URL = assetUrl(HOME_BACKGROUND_FILE)
