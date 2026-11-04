import { HOME_BACKGROUND_FILE } from './ui'

export const STATIC_ASSET_BASE_URL = (import.meta.env.VITE_STATIC_ASSET_BASE_URL || '').replace(
  /\/+$/,
  ''
)
export const LOGIN_BOTANICAL_IMAGE_URL = STATIC_ASSET_BASE_URL
  ? `${STATIC_ASSET_BASE_URL}/brand/u00-botanical-watercolor@3x.png`
  : ''

export const HOME_BACKGROUND_IMAGE_URL = `${STATIC_ASSET_BASE_URL || '/design-assets'}/${HOME_BACKGROUND_FILE}`
