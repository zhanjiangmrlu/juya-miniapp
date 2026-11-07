export interface LoginSnapshot {
  page: string
  type: 'page' | 'scene' | 'listening'
  id: string
  tab: string
  category: string
  loadedCount?: number
  scroll: number
  translation: boolean
  audioPosition: number
  playbackRate: number
  version: string
}
