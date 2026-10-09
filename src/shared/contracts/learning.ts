import type { StablePosition } from './common'
import type { AccessLevel } from '@/shared/enums/entitlements'
import type { SceneEntryType } from '@/shared/enums/learning'

export interface LearningModule {
  enabled: boolean
  key: string
  public_id: string
  title: string
}
export interface LearningModulesResponse {
  items: LearningModule[]
}
export interface SceneSummary {
  access: AccessLevel
  category?: string
  chinese_title: string
  description?: string
  image_url?: string
  progress?: number
  scene_id: string
  series: string
  status?: string
  tags: string[]
  title: string
  trial_sentence?: string
}
export interface LearningCatalogResponse {
  authorization_pending: boolean
  items: SceneSummary[]
  profile_completion_enabled?: boolean
}
export type { SceneEntryType } from '@/shared/enums/learning'
export interface AudioTarget {
  scene_id?: string
  revision_id?: string
  resource_id?: string
  sentence_id?: string
  start_ms?: number
  end_ms?: number
  duration_ms?: number
  target_id: string
  target_type: string
  version_id: string
}
export interface SceneEntry {
  entry_version?: number
  revision_id?: string
  scene_id?: string
  sentence_snapshot?: string
  source_sentence_ids?: string[]
  clickable_spans?: ClickableSpan[]
  favorited?: boolean
  audio?: AudioTarget
  audio_timing?: {
    target_id: string
    version_id: string
    start_ms: number
    end_ms: number
    timing_confirmed: boolean
  }
  chinese?: string
  entry_id: string
  entry_type: SceneEntryType
  explanation?: string
  phonetic?: string
  source_locator: string
  speaker?: string
  text: string
}
export interface SceneContent extends SceneSummary {
  revision_id?: string
  content_version?: number
  original_image_asset_id?: string | null
  cover_asset_id?: string | null
  audio?: AudioTarget
  entries: SceneEntry[]
  hero_image_url?: string
}

export interface ClickableSpan {
  start: number
  end: number
  entry_id: string
  entry_version: number
  source_locator: string
}
export interface PublishedEntry {
  entry_id: string
  entry_version: number
  english: string
  phonetic?: string
  chinese: string
  explanation: string
  source_sentence_ids: readonly string[]
  audio_target_id?: string | null
  audio_version_id?: string | null
}
export interface PublishedScene {
  scene_id: string
  revision_id: string
  content_version: number
  content: {
    title_en: string
    title_zh: string
    summary: string
    tags: readonly string[]
    original_image_asset_id: string | null
    cover_asset_id: string | null
    audio: { target_id: string; version_id: string; asset_id: string; duration_ms: number } | null
    dialogue: readonly {
      id: string
      speaker: string
      english: string
      chinese: string
      start_ms: number | null
      end_ms: number | null
      audio_version_id: string | null
      timing_confirmed: boolean
      clickable_spans: readonly ClickableSpan[]
    }[]
    vocabulary: readonly PublishedEntry[]
    chunks: readonly PublishedEntry[]
  }
}
export interface PreviewScene {
  public_id: string
  title: string
  title_en?: string
  title_zh?: string
  series?: string | null
  cover_url?: string | null
  introduction?: string | null
  preview_status?: 'PREVIEW'
}
export interface SceneOpenWireResponse {
  access: AccessLevel | null
  activated_at: string | null
  authorization_pending: boolean
  earliest_expires_at: string | null
  scene: PublishedScene | PreviewScene | SceneContent | null
  sources: readonly string[]
}
export interface SceneEntryQuery {
  revision_id: string
  entry_version: number
  source_locator: string
}
export interface SignedResourceResponse {
  resource_id: string
  url: string
  expires_at: string
}
export interface SceneOpenResponse {
  access: AccessLevel | null
  activated_at: string | null
  authorization_pending: boolean
  earliest_expires_at: string | null
  scene: SceneContent | null
  sources: string[]
}
export interface LearningProgress {
  client_sequence: number
  completed_at: string | null
  last_learned_at: string
  position: StablePosition
  scene_id: string
  source_type: 'SCENE'
  started_at: string
}
export interface SignedMediaResponse {
  expires_at: string
  target_id: string
  url: string
}
