import type { CursorPage } from './common'
import type { AudioTarget, PublishedEntry } from './learning'
export type FavoriteType = 'VOCABULARY' | 'PHRASE'
export interface FavoriteSource {
  scene_title?: string
  revision_id?: string | null
  entry_version?: number | null
  entry_snapshot?: PublishedEntry | null
  original_link: string | null
  scene_id: string
  sentence_snapshot: string
  source_locator: string
}
export interface FavoriteItem {
  english?: string
  chinese?: string
  translation?: string
  phonetic?: string
  explanation?: string
  audio?: AudioTarget
  entry_stable_id: string
  entry_type: FavoriteType
  favorited_at: string
  id: string
  last_reviewed_at: string | null
  normalized_key: string
  sources: FavoriteSource[]
}
export type FavoritePage = CursorPage<FavoriteItem>
export interface ReviewSession {
  card_count: number
  id: string
  started_at: string
}
