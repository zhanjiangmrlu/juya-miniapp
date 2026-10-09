import { describe, expect, it } from 'vitest'

import { createSceneModel, createSceneViewState } from '@/features/scene/scene-model'

import type { SceneOpenResponse } from '@/shared/contracts/learning'

const base: SceneOpenResponse = {
  access: 'OPEN',
  activated_at: null,
  authorization_pending: false,
  earliest_expires_at: null,
  scene: {
    access: 'OPEN',
    chinese_title: '城堡展览讨论会',
    entries: [
      {
        chinese: '你觉得他们为什么举办这个展览？',
        entry_id: 'entry-1',
        entry_type: 'DIALOGUE',
        source_locator: 'sentence-1',
        speaker: 'Ivy',
        text: 'Why do you think they put together this exhibit?'
      }
    ],
    scene_id: 'scene-1',
    series: '日常英语',
    tags: [],
    title: 'Discussing the Castle Exhibit'
  },
  sources: ['OPEN']
}

describe('createSceneModel', () => {
  it('完整模型保留修订、音频和原图字段，预览不泄露资源', () => {
    const scene = {
      ...base.scene!,
      revision_id: 'revision',
      content_version: 3,
      original_image_asset_id: 'original',
      audio: { target_id: 'audio', target_type: 'SCENE', version_id: 'v1' }
    }
    expect(createSceneModel({ ...base, scene })).toMatchObject({
      revision_id: 'revision',
      content_version: 3,
      original_image_asset_id: 'original',
      audio: scene.audio
    })
    expect(createSceneModel({ ...base, access: 'PREVIEW', scene })).not.toHaveProperty('audio')
  })
  it('完整、预览和拒绝响应产生互斥模型', () => {
    const full = createSceneModel(base)
    const preview = createSceneModel({
      ...base,
      access: 'PREVIEW',
      scene: { ...base.scene!, access: 'PREVIEW' }
    })
    const denied = createSceneModel({ ...base, access: null, scene: null })

    expect(full).toMatchObject({ kind: 'FULL', entries: [{ entry_id: 'entry-1' }] })
    expect(preview).toMatchObject({ kind: 'PREVIEW', sceneId: 'scene-1' })
    expect(preview).not.toHaveProperty('entries')
    expect(denied).toEqual({ authorizationPending: false, kind: 'DENIED' })
  })

  it('每次进入场景都默认关闭中文', () => {
    expect(createSceneViewState().chineseVisible).toBe(false)
    expect(createSceneViewState({ chineseVisible: true }).chineseVisible).toBe(false)
  })
})
