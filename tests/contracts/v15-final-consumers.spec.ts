import { describe, expect, it } from 'vitest'

import { presentCatalog } from '@/features/learning/catalog-presenter'
import { adaptSceneResponse } from '@/services/scene-response'

import type { components } from '../fixtures/contracts/v15-b38294b/provider'

import openapi from '../fixtures/contracts/v15-b38294b/openapi.json'

describe('BFF b38294b 最终消费契约', () => {
  it.each([true, false])('旧PublishedScene录音开关%s严格透传，不猜默认开启', (flag) => {
    const scene = {
      scene_id: 'fixture',
      revision_id: 'revision',
      content_version: 1,
      recording_enabled: flag,
      content: {
        schema_version: 1,
        template_type: 'dialogue',
        copyright: 'fixture',
        source: 'self-authored',
        title_en: 'Fixture',
        title_zh: '测试',
        summary: '',
        tags: [],
        original_image_asset_id: null,
        cover_asset_id: null,
        audio: null,
        dialogue: [],
        vocabulary: [],
        chunks: []
      }
    } satisfies components['schemas']['PublishedScene']
    const result = adaptSceneResponse({
      access: 'OPEN',
      activated_at: null,
      earliest_expires_at: null,
      authorization_pending: false,
      sources: ['OPEN'],
      scene
    })
    expect(result.scene?.recording_enabled).toBe(flag === true)
  })
  it.each([true, false])('资料次级入口只消费权威配置%s', (enabled) => {
    const catalog = {
      items: [],
      user_stage: 'NEW',
      authorization_pending: false,
      profile_completion_enabled: enabled
    } satisfies components['schemas']['LearningCatalog']
    expect(presentCatalog({ modules: [], catalog }).showProfileAction).toBe(enabled)
    expect(
      openapi.components.schemas.LearningCatalog.properties.profile_completion_enabled
    ).toMatchObject({ type: 'boolean', default: false })
    expect(openapi.components.schemas.PublishedScene.properties.recording_enabled).toMatchObject({
      type: 'boolean',
      default: false
    })
  })
})
