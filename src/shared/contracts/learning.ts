import type { AccessLevel, StablePosition } from './common'

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
}
export interface LearningCatalogResponse {
  authorization_pending: boolean
  items: SceneSummary[]
  profile_completion_enabled?: boolean
}
export type SceneEntryType = 'DIALOGUE' | 'VOCABULARY' | 'PHRASE'
export interface AudioTarget {
  target_id: string
  target_type: string
  version_id: string
}
export interface SceneEntry {
  audio?: AudioTarget
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
  entries: SceneEntry[]
  hero_image_url?: string
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
