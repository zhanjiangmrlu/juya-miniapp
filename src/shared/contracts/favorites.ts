import type { PronunciationTarget } from './audio'
import type { CursorPage } from './common'
import type { AudioTarget, PublishedEntry } from './learning'
import type { FavoriteSourceStatus, FavoriteType } from '@/shared/enums/favorites'
export type { FavoriteType } from '@/shared/enums/favorites'
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
  legacy_incomplete?: boolean
  missing_fields?: string[]
  favorite_id?: string
  active?: boolean
  content_type?: string
  content_id?: string
  content_version?: number | null
  entry_id?: string
  sense_id?: string
  source_id?: string
  snapshot_version?: number
  saved_content_version?: number | null
  pronunciation?: {
    target_id: string
    resource_version?: string
    can_prepare?: boolean
    status?: string
  } | null
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

/** 收藏请求只携带本篇确认资料引用 */
export interface FavoriteReference {
  content_type: string
  content_id: string
  content_version: number
  entry_id: string
  sense_id: string
  source_id: string
}
/** schema2快照响应，旧FavoriteItem投影继续保留兼容 */
export interface FavoriteSnapshot extends Omit<FavoriteReference, 'content_version'> {
  content_version: number | null
  legacy_incomplete?: boolean
  missing_fields?: string[]
  schema_version?: 2
  revision_id?: string | null
  favorite_id: string
  active: boolean
  entry_type: string
  snapshot_version: number
  saved_content_version: number | null
  english: string
  phonetic?: string | null
  meaning_zh?: string
  chinese?: string
  explanation?: string | null
  source_sentence: string
  source_title: string
  source_locator?: string | FavoriteSourceLocator | Record<string, string | number> | null
  image_asset_id?: string | null
  favorited_at: string
  last_reviewed_at: string | null
  pronunciation?:
    (Omit<PronunciationTarget, 'resource_version'> & { resource_version?: string | null }) | null
}
/** BFF已确认的当前来源位置，不以英文或句序猜配 */
export interface FavoriteSourceLocator {
  sentence_id?: string | null
  paragraph_id?: string | null
}
/** BFF内部保存模型，仅用于明确兼容数据样本 */
export interface StoredFavoriteSnapshot extends Pick<
  FavoriteSnapshot,
  | 'favorite_id'
  | 'active'
  | 'snapshot_version'
  | 'saved_content_version'
  | 'favorited_at'
  | 'last_reviewed_at'
  | 'schema_version'
> {
  data: Pick<
    FavoriteSnapshot,
    | 'english'
    | 'phonetic'
    | 'meaning_zh'
    | 'explanation'
    | 'source_sentence'
    | 'source_title'
    | 'source_locator'
    | 'image_asset_id'
    | 'pronunciation'
  > & {
    reference: FavoriteReference & { entry_type: string | null }
    revision_id: string
  }
}
export interface FavoriteMutationState {
  favorite_id: string
  active: boolean
  snapshot_version?: number
}
export interface FavoriteSourceResolution {
  content_type: string
  content_id: string
  saved_content_version: number | null
  target_content_version: number | null
  status: FavoriteSourceStatus
  locator?: FavoriteSourceLocator | string | null
  safe_summary: { [key: string]: string | number | undefined }
}
export interface ReviewSession {
  card_count: number
  id: string
  started_at: string
}
