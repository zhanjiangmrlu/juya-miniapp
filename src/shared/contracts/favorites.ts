import type { CursorPage } from './common'
export type FavoriteType = 'VOCABULARY' | 'PHRASE'
export interface FavoriteSource {
  original_link: string | null
  scene_id: string
  sentence_snapshot: string
  source_locator: string
}
export interface FavoriteItem {
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
