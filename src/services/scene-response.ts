import { AudioTargetType } from '@/shared/enums/audio'
import { AccessLevel } from '@/shared/enums/entitlements'
import { SceneEntryType, SceneLookupEntryType } from '@/shared/enums/learning'

import type {
  AudioTarget,
  PublishedEntry,
  PublishedScene,
  SceneContent,
  SceneEntry,
  SceneOpenResponse,
  SceneOpenWireResponse
} from '@/shared/contracts/learning'
import type { ConfirmedSceneEntry, SceneSnapshot } from '@/shared/contracts/scene-snapshot'

/** 转换schema2授权快照，scene为冻结的同版资料，access为当前授权级别 */
const adaptSnapshot = (scene: SceneSnapshot, access: SceneContent['access']): SceneContent => {
  const audio = scene.whole_audio
    ? {
        scene_id: scene.content_id,
        revision_id: scene.revision_id,
        resource_id: scene.whole_audio.target_id,
        target_id: scene.whole_audio.target_id,
        version_id: scene.whole_audio.resource_version,
        duration_ms: scene.whole_audio.duration_ms,
        target_type: AudioTargetType.SCENE
      }
    : undefined
  /** 转换确认条目，entry为本篇义项资料，type为词汇或语块 */
  const entryModel = (entry: ConfirmedSceneEntry, type: SceneLookupEntryType): SceneEntry => ({
    entry_id: entry.entry_id,
    content_type: scene.content_type,
    entry_type: type,
    text: entry.english,
    phonetic: entry.phonetic ?? undefined,
    chinese: entry.meaning_zh,
    explanation: entry.explanation,
    sense_id: entry.sense_id,
    source_id: entry.source_id,
    sentence_snapshot: entry.source_sentence,
    source_locator: entry.source_locator?.sentence_id ?? '',
    source_sentence_ids: entry.source_locator?.sentence_id
      ? [entry.source_locator.sentence_id]
      : [],
    scene_id: scene.content_id,
    revision_id: scene.revision_id,
    image_asset_id: type === SceneLookupEntryType.VOCABULARY ? entry.image_asset_id : undefined,
    pronunciation: entry.pronunciation
      ? {
          ...entry.pronunciation,
          resource_version: entry.pronunciation.resource_version ?? undefined
        }
      : entry.pronunciation,
    favorited: entry.is_favorited,
    favorite_id: entry.favorite_id
  })
  return {
    scene_id: scene.content_id,
    revision_id: scene.revision_id,
    content_version: scene.content_version,
    content_type: scene.content_type,
    original_image_asset_id: scene.learning_image_asset_id,
    cover_asset_id: scene.cover_asset_id,
    recording_enabled: scene.recording_enabled === true,
    access,
    title: scene.title_en,
    chinese_title: scene.title_zh,
    series: scene.series ?? '',
    tags: [...(scene.tags ?? [])],
    audio,
    entries: [
      ...scene.dialogue.map((sentence): SceneEntry => ({
        entry_id: sentence.sentence_id,
        source_locator: sentence.sentence_id,
        entry_type: SceneEntryType.DIALOGUE,
        text: sentence.english,
        chinese: sentence.chinese,
        speaker: sentence.speaker,
        scene_id: scene.content_id,
        revision_id: scene.revision_id,
        clickable_spans: [],
        ...(sentence.slice_target_id && sentence.slice_version
          ? {
              audio: {
                target_id: sentence.slice_target_id,
                resource_id: sentence.slice_target_id,
                version_id: sentence.slice_version,
                target_type: AudioTargetType.SENTENCE,
                scene_id: scene.content_id,
                revision_id: scene.revision_id,
                sentence_id: sentence.sentence_id
              }
            }
          : {}),
        ...(audio &&
        sentence.start_ms != null &&
        sentence.end_ms != null &&
        sentence.start_ms >= 0 &&
        sentence.end_ms > sentence.start_ms &&
        sentence.end_ms <= audio.duration_ms
          ? {
              audio_timing: {
                target_id: audio.target_id,
                version_id: audio.version_id,
                start_ms: sentence.start_ms,
                end_ms: sentence.end_ms,
                timing_confirmed: true
              }
            }
          : {})
      })),
      ...scene.words.map((entry) => entryModel(entry, SceneLookupEntryType.VOCABULARY)),
      ...scene.chunks.map((entry) => entryModel(entry, SceneLookupEntryType.PHRASE))
    ]
  }
}

/** 将指定发布场景的资源与播放类型转换为受修订约束的音频目标 */
const audioTarget = (
  scene: PublishedScene,
  targetId: string,
  versionId: string,
  type: string
): AudioTarget => ({
  scene_id: scene.scene_id,
  revision_id: scene.revision_id,
  resource_id: targetId,
  target_id: targetId,
  version_id: versionId,
  target_type: type
})

/** 转换发布词条及类型，保留版本和已确认的来源原句 */
const adaptEntry = (
  scene: PublishedScene,
  entry: PublishedEntry,
  type: SceneLookupEntryType
): SceneEntry => ({
  entry_id: entry.entry_id,
  entry_version: entry.entry_version,
  entry_type: type,
  text: entry.english,
  phonetic: entry.phonetic,
  chinese: entry.chinese,
  explanation: entry.explanation,
  revision_id: scene.revision_id,
  scene_id: scene.scene_id,
  source_sentence_ids: [...entry.source_sentence_ids],
  source_locator: `${type === SceneLookupEntryType.PHRASE ? 'chunks' : 'vocabulary'}:${entry.entry_id}`,
  sentence_snapshot:
    scene.content.dialogue
      .filter((sentence) => entry.source_sentence_ids.includes(sentence.id))
      .map((sentence) => sentence.english)
      .join('\n') || entry.english,
  ...(entry.audio_target_id && entry.audio_version_id
    ? {
        audio: audioTarget(
          scene,
          entry.audio_target_id,
          entry.audio_version_id,
          type === SceneLookupEntryType.PHRASE ? AudioTargetType.PHRASE : AudioTargetType.WORD
        )
      }
    : {})
})

/** 将场景打开响应转为页面契约，预览只使用白名单摘要 */
export const adaptSceneResponse = (response: SceneOpenWireResponse): SceneOpenResponse => {
  const result: SceneOpenResponse = { ...response, sources: [...response.sources], scene: null }
  const scene = response.scene
  if (!scene || !response.access || response.access === AccessLevel.HIDDEN) return result
  if (response.access === AccessLevel.PREVIEW) {
    if (!('public_id' in scene || 'entries' in scene)) return result
    const preview = 'public_id' in scene ? scene : undefined
    const legacy = 'entries' in scene ? scene : undefined
    result.scene = {
      access: AccessLevel.PREVIEW,
      scene_id: preview?.public_id ?? legacy!.scene_id,
      title: preview?.title_en || preview?.title || legacy?.title || '',
      chinese_title: preview?.title_zh || legacy?.chinese_title || '',
      series: preview?.series || legacy?.series || '',
      tags: [],
      entries: [],
      description: preview?.introduction || legacy?.description || '',
      image_url: preview?.cover_url || legacy?.image_url || undefined
    }
    return result
  }
  if ('words' in scene) {
    result.scene = adaptSnapshot(scene, response.access)
    return result
  }
  if (!('content' in scene)) {
    if ('entries' in scene) result.scene = scene
    return result
  }
  const content = scene.content
  const audio = content.audio
    ? {
        ...audioTarget(
          scene,
          content.audio.target_id,
          content.audio.version_id,
          AudioTargetType.SCENE
        ),
        duration_ms: content.audio.duration_ms
      }
    : undefined
  const entries: SceneEntry[] = content.dialogue.map((sentence) => {
    // 同版本有效时间用于阅读定位，逐句播放仍要求管理端确认
    const timing =
      audio &&
      sentence.audio_version_id === audio.version_id &&
      sentence.start_ms !== null &&
      sentence.end_ms !== null &&
      Number.isFinite(sentence.start_ms) &&
      Number.isFinite(sentence.end_ms) &&
      sentence.start_ms >= 0 &&
      sentence.start_ms < sentence.end_ms &&
      sentence.end_ms <= (audio.duration_ms ?? 0)
        ? {
            target_id: audio.target_id,
            version_id: audio.version_id,
            start_ms: sentence.start_ms,
            end_ms: sentence.end_ms,
            timing_confirmed: sentence.timing_confirmed
          }
        : undefined
    return {
      entry_id: sentence.id,
      entry_type: SceneEntryType.DIALOGUE,
      text: sentence.english,
      chinese: sentence.chinese,
      speaker: sentence.speaker,
      source_locator: sentence.id,
      scene_id: scene.scene_id,
      revision_id: scene.revision_id,
      clickable_spans: [...sentence.clickable_spans],
      ...(timing ? { audio_timing: timing } : {}),
      ...(audio && timing?.timing_confirmed
        ? {
            audio: {
              ...audio,
              target_type: AudioTargetType.SCENE,
              sentence_id: sentence.id,
              start_ms: timing.start_ms,
              end_ms: timing.end_ms
            }
          }
        : {})
    }
  })
  entries.push(
    ...content.vocabulary.map((entry) => adaptEntry(scene, entry, SceneLookupEntryType.VOCABULARY)),
    ...content.chunks.map((entry) => adaptEntry(scene, entry, SceneLookupEntryType.PHRASE))
  )
  const adapted: SceneContent = {
    scene_id: scene.scene_id,
    revision_id: scene.revision_id,
    content_version: scene.content_version,
    access: response.access,
    title: content.title_en,
    chinese_title: content.title_zh,
    description: content.summary,
    series: content.tags[0] ?? '',
    tags: [...content.tags],
    original_image_asset_id: content.original_image_asset_id,
    cover_asset_id: content.cover_asset_id,
    audio,
    entries
  }
  result.scene = adapted
  return result
}
