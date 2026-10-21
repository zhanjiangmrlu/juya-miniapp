export interface ProcessingMedia {
  id: string
  state: string
}
export interface GeneratedThumbnail {
  thumbnailSrc: string
  originalSrc: string
}
export interface ThumbnailCacheEntry {
  created: number
  result: Promise<GeneratedThumbnail>
}
export interface MediaAddressCacheEntry {
  expires: number
  address: Promise<string>
}
export interface MediaWaitOptions {
  active: () => boolean
  pause?: () => Promise<void>
  checks?: number
}
