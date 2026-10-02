import { describe, expect, it } from 'vitest'

import { adaptSceneResponse } from './scene-response'

const published = {
  access: 'OPEN',
  activated_at: null,
  authorization_pending: false,
  earliest_expires_at: null,
  sources: ['OPEN'],
  scene: {
    scene_id: 'coffee',
    revision_id: 'revision-2',
    content_version: 2,
    content: {
      title_en: 'At the Coffee Shop',
      title_zh: '在咖啡店',
      summary: '',
      tags: [],
      original_image_asset_id: 'original-1',
      cover_asset_id: 'cover-1',
      audio: {
        target_id: 'dialogue-audio',
        version_id: 'audio-2',
        asset_id: 'asset-2',
        duration_ms: 10000
      },
      dialogue: [
        {
          id: 'sentence-1',
          speaker: 'Ivy',
          english: 'A latte, please.',
          chinese: '请来杯拿铁',
          start_ms: 1000,
          end_ms: 3000,
          audio_version_id: 'audio-2',
          timing_confirmed: true,
          clickable_spans: [
            {
              start: 2,
              end: 7,
              entry_id: 'latte',
              entry_version: 3,
              source_locator: 'sentence:sentence-1:entry:latte'
            }
          ]
        }
      ],
      vocabulary: [
        {
          entry_id: 'latte',
          entry_version: 3,
          english: 'latte',
          phonetic: '/ˈlɑːteɪ/',
          chinese: '拿铁',
          explanation: '',
          source_sentence_ids: ['sentence-1']
        }
      ],
      chunks: []
    }
  }
} as const

describe('场景接口适配', () => {
  it('保留发布修订、整段音频和句子区间，不创建独立句子音频', () => {
    const result = adaptSceneResponse(published)
    expect(result.scene).toMatchObject({
      revision_id: 'revision-2',
      content_version: 2,
      original_image_asset_id: 'original-1'
    })
    expect(result.scene?.entries[0]?.audio).toMatchObject({
      target_id: 'dialogue-audio',
      version_id: 'audio-2',
      start_ms: 1000,
      end_ms: 3000,
      sentence_id: 'sentence-1'
    })
    expect(result.scene?.entries[0]?.clickable_spans?.[0]?.entry_version).toBe(3)
    expect(result.scene?.entries[1]?.sentence_snapshot).toBe('A latte, please.')
    expect(result.scene?.entries[1]?.audio).toBeUndefined()
  })

  it('只读预览仅转换安全摘要，即使响应混入正文也不传播', () => {
    const mixedPreview = {
      public_id: 'coffee',
      title: 'Coffee',
      title_zh: '咖啡',
      cover_url: '/safe.png',
      content: published.scene.content
    }
    const result = adaptSceneResponse({ ...published, access: 'PREVIEW', scene: mixedPreview })
    expect(result.scene).toMatchObject({
      scene_id: 'coffee',
      access: 'PREVIEW',
      entries: [],
      image_url: '/safe.png'
    })
    expect(result.scene).not.toHaveProperty('original_image_asset_id')
    expect(result.scene).not.toHaveProperty('audio')
  })

  it('权限响应无法识别时拒绝展示正文', () => {
    expect(
      adaptSceneResponse({ ...published, access: 'PREVIEW', scene: published.scene }).scene
    ).toBeNull()
  })
})
