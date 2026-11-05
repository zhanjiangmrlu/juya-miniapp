import type { AssetManifest } from '@/shared/types/assets'

export const STATIC_ASSET_BASE_URL = (import.meta.env.VITE_STATIC_ASSET_BASE_URL || '').replace(
  /\/+$/,
  ''
)
export const ASSET_MANIFEST: AssetManifest =
  typeof __JUYA_ASSET_MANIFEST__ === 'undefined' ? {} : __JUYA_ASSET_MANIFEST__
