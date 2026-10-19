export interface ProcessingMedia {
  id: string
  state: string
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
