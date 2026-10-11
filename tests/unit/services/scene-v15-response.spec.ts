import { describe, expect, it } from 'vitest'

import { adaptSceneResponse } from '@/services/scene-response'

const response = {
  access: 'OPEN',
  activated_at: null,
  authorization_pending: false,
  earliest_expires_at: null,
  sources: ['OPEN'],
  scene: {
    scene_id: 'coffee',
    content_id: 'coffee',
    revision_id: 'rev-2',
    content_version: 2,
    schema_version: 2,
    content_type: 'dialogue',
    title_en: 'Coffee',
    title_zh: '咖啡店',
    dialogue: [
      {
        sentence_id: 's1',
        speaker: 'Ivy',
        english: 'A medium.',
        chinese: '中杯。',
        position: 1,
        start_ms: 0,
        end_ms: 2000,
        slice_target_id: 'slice-1',
        slice_version: 'slice-v2'
      }
    ],
    words: [
      {
        entry_id: 'e1',
        entry_type: 'word',
        sense_id: 'sense-1',
        source_id: 'source-1',
        english: 'medium',
        phonetic: '/medium/',
        meaning_zh: '中杯',
        explanation: '完整解释',
        source_sentence: 'A medium.',
        source_locator: { sentence_id: 's1' },
        image_asset_id: 'word-image',
        pronunciation: { target_id: 'p1', can_prepare: true },
        is_favorited: true,
        favorite_id: 'f1'
      }
    ],
    chunks: [],
    whole_audio: { target_id: 'whole', resource_version: 'whole-v2', duration_ms: 2000 }
  }
} as const

describe('V1.5同版本授权详情', () => {
  it('已确认但尚无资源版本的发音不将null传成轮询字符串版本', () => {
    const actual = {
      ...response,
      scene: {
        ...response.scene,
        words: response.scene.words.map((entry) => ({
          ...entry,
          pronunciation: { ...entry.pronunciation, resource_version: null }
        }))
      }
    }
    expect(
      adaptSceneResponse(actual).scene?.entries[1]?.pronunciation?.resource_version
    ).toBeUndefined()
  })
  it('消费实际BFF同版词卡DTO并保留学习原图与内容类型', () => {
    const actual = {
      ...response,
      scene: {
        ...response.scene,
        content_type: 'word_card',
        learning_image_asset_id: 'learning-image',
        cover_asset_id: 'cover'
      }
    }
    expect(adaptSceneResponse(actual).scene).toMatchObject({
      content_type: 'word_card',
      original_image_asset_id: 'learning-image',
      cover_asset_id: 'cover'
    })
    expect(adaptSceneResponse(actual).scene?.entries[1]).toMatchObject({
      content_type: 'word_card'
    })
  })
  it('保留独立切片、完整词条及真实收藏状态而不复用整段截时', () => {
    const result = adaptSceneResponse(response).scene
    expect(result?.entries[0]?.audio).toMatchObject({
      target_id: 'slice-1',
      version_id: 'slice-v2',
      sentence_id: 's1'
    })
    expect(result?.entries[0]?.audio).not.toHaveProperty('start_ms')
    expect(result?.entries[1]).toMatchObject({
      text: 'medium',
      chinese: '中杯',
      sense_id: 'sense-1',
      source_id: 'source-1',
      favorite_id: 'f1',
      favorited: true,
      image_asset_id: 'word-image',
      pronunciation: { target_id: 'p1' }
    })
    expect(result?.entries[0]?.clickable_spans).toEqual([])
  })
  it('schema2缺切片时不把整段时间点伪装成单句资源', () => {
    const value = structuredClone(response)
    Object.assign(value.scene.dialogue[0], { slice_target_id: null, slice_version: null })
    expect(adaptSceneResponse(value).scene?.entries[0]?.audio).toBeUndefined()
  })
  it('预览不会传播schema2的正文与词汇', () => {
    expect(adaptSceneResponse({ ...response, access: 'PREVIEW' }).scene).toBeNull()
  })
})
