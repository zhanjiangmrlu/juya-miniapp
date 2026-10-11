/** V1.5冻结的确认条目，正文只由服务端授权详情返回 */
export interface ConfirmedSceneEntry {
  entry_id: string
  entry_type: string
  sense_id: string
  source_id: string
  english: string
  phonetic?: string | null
  meaning_zh: string
  explanation: string
  source_sentence: string
  source_locator: { sentence_id?: string } | null
  image_asset_id?: string | null
  pronunciation?: {
    target_id: string
    can_prepare: boolean
    resource_version?: string
    status?: string
  } | null
  is_favorited: boolean
  favorite_id: string | null
}

export interface SceneSnapshot {
  learning_image_asset_id?: string | null
  cover_asset_id?: string | null
  recording_enabled?: boolean
  content_id: string
  content_type: string
  content_version: number
  revision_id: string
  schema_version: number
  title_en: string
  title_zh: string
  series?: string
  tags?: readonly string[]
  dialogue: readonly {
    sentence_id: string
    speaker: string
    english: string
    chinese: string
    position: number
    start_ms?: number | null
    end_ms?: number | null
    slice_target_id?: string | null
    slice_version?: string | null
  }[]
  words: readonly ConfirmedSceneEntry[]
  chunks: readonly ConfirmedSceneEntry[]
  whole_audio: { target_id: string; resource_version: string; duration_ms: number } | null
}
