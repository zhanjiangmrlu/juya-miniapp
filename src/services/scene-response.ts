import type {
  AudioTarget,
  PublishedEntry,
  PublishedScene,
  SceneContent,
  SceneEntry,
  SceneOpenResponse,
  SceneOpenWireResponse
} from '@/shared/contracts/learning'
import type { SceneLookupEntryType } from '@/shared/enums/learning'

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
  source_locator: `${type === 'PHRASE' ? 'chunks' : 'vocabulary'}:${entry.entry_id}`,
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
          type === 'PHRASE' ? 'phrase' : 'word'
        )
      }
    : {})
})

/** 将场景打开响应转为页面契约，预览只使用白名单摘要 */
export const adaptSceneResponse = (response: SceneOpenWireResponse): SceneOpenResponse => {
  const result: SceneOpenResponse = { ...response, sources: [...response.sources], scene: null }
  const scene = response.scene
  if (!scene || !response.access || response.access === 'HIDDEN') return result
  if (response.access === 'PREVIEW') {
    if (!('public_id' in scene || 'entries' in scene)) return result
    const preview = 'public_id' in scene ? scene : undefined
    const legacy = 'entries' in scene ? scene : undefined
    result.scene = {
      access: 'PREVIEW',
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
  if (!('content' in scene)) {
    if ('entries' in scene) result.scene = scene
    return result
  }
  const content = scene.content
  const audio = content.audio
    ? {
        ...audioTarget(scene, content.audio.target_id, content.audio.version_id, 'scene'),
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
      entry_type: 'DIALOGUE',
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
              target_type: 'sentence',
              sentence_id: sentence.id,
              start_ms: timing.start_ms,
              end_ms: timing.end_ms
            }
          }
        : {})
    }
  })
  entries.push(
    ...content.vocabulary.map((entry) => adaptEntry(scene, entry, 'VOCABULARY')),
    ...content.chunks.map((entry) => adaptEntry(scene, entry, 'PHRASE'))
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
