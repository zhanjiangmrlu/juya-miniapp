import published from '@/services/mock/published-scene.json'

import type { ConfirmedSceneEntry, SceneSnapshot } from '@/shared/contracts/scene-snapshot'

/** 只供显式Mock模式的schema2资料，不是人工发布或真人声音验收 */
export const createSceneSnapshotFixture = (
  favorited: (entryId: string) => { is_favorited: boolean; favorite_id: string | null }
) => {
  const content = published.scene.content
  /** 转换已存在的演示条目，entry为隔离fixture，type为词汇／语块类型 */
  const entry = (
    value: (typeof content.vocabulary)[number] | (typeof content.chunks)[number],
    type: string
  ): ConfirmedSceneEntry => ({
    entry_id: value.entry_id,
    entry_type: type,
    sense_id: `sense-${value.entry_id}`,
    source_id: value.source_sentence_ids[0]!,
    english: value.english,
    phonetic: 'phonetic' in value ? value.phonetic : null,
    meaning_zh: value.entry_id === 'word-medium' ? '中杯' : value.chinese,
    explanation: value.explanation,
    source_sentence: content.dialogue
      .filter((sentence) => value.source_sentence_ids.includes(sentence.id))
      .map((sentence) => sentence.english)
      .join('\n'),
    source_locator: { sentence_id: value.source_sentence_ids[0] },
    image_asset_id: value.entry_id === 'word-latte' ? 'coffee-word-latte' : null,
    pronunciation: {
      target_id: `pronunciation-${value.entry_id}`,
      resource_version: 'fixture-v1',
      can_prepare: true
    },
    ...favorited(value.entry_id)
  })
  const scene: SceneSnapshot = {
    content_id: published.scene.scene_id,
    content_type: 'dialogue',
    content_version: 1,
    revision_id: published.scene.revision_id,
    schema_version: 2,
    recording_enabled: true,
    title_en: content.title_en,
    title_zh: content.title_zh,
    series: content.tags[0],
    dialogue: content.dialogue.map((sentence, index) => ({
      sentence_id: sentence.id,
      speaker: sentence.speaker,
      english: sentence.english,
      chinese: sentence.chinese,
      position: index + 1,
      start_ms: sentence.start_ms,
      end_ms: sentence.end_ms,
      slice_target_id: `fixture-slice-${sentence.id}`,
      slice_version: 'fixture-slice-v1'
    })),
    words: content.vocabulary.slice(0, 2).map((value) => entry(value, 'word')),
    chunks: content.chunks.map((value) => entry(value, 'chunk')),
    whole_audio: {
      target_id: content.audio.target_id,
      resource_version: content.audio.version_id,
      duration_ms: content.audio.duration_ms
    }
  }
  return { ...published, scene }
}
