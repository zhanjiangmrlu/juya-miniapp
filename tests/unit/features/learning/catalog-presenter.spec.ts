import { describe, expect, it } from 'vitest'

import { presentCatalog } from '@/features/learning/catalog-presenter'

import type {
  LearningCatalogResponse,
  LearningModule,
  SceneSummary
} from '@/shared/contracts/learning'

const modules: LearningModule[] = [
  { enabled: true, key: 'scene_learning', public_id: 'module-scene', title: '场景学习' },
  { enabled: true, key: 'future_module', public_id: 'module-future', title: '未来模块' },
  { enabled: false, key: 'scene_learning', public_id: 'module-disabled', title: '已停用场景' }
]

/** 创建目录测试场景，避免每个用例重复与规则无关的展示字段。 */
function scene(overrides: Partial<SceneSummary> & Pick<SceneSummary, 'access' | 'scene_id'>) {
  return {
    chinese_title: `中文 ${overrides.scene_id}`,
    series: '日常英语',
    tags: [],
    title: `Scene ${overrides.scene_id}`,
    ...overrides
  } satisfies SceneSummary
}

/** 使用真实响应结构生成 presenter 输入。 */
function catalog(items: SceneSummary[]): LearningCatalogResponse {
  return { authorization_pending: false, items }
}

describe('presentCatalog', () => {
  it('新用户优先展示开放场景，并忽略未知或停用模块', () => {
    const result = presentCatalog({
      catalog: catalog([
        scene({ access: 'OPEN', scene_id: 'open-1' }),
        scene({ access: 'OPEN', scene_id: 'open-2' }),
        scene({ access: 'PREVIEW', scene_id: 'preview-1' })
      ]),
      modules
    })

    expect(result.modules.map((item) => item.key)).toEqual(['scene_learning'])
    expect(result.stage).toBe('NEW')
    expect(result.openScenes.map((item) => item.sceneId)).toEqual(['open-1', 'open-2'])
    expect(result.openReview).toBeNull()
  })

  it('已有权益用户优先当前学习和权益内容，开放场景收纳为单一入口', () => {
    const result = presentCatalog({
      catalog: catalog([
        scene({ access: 'FORMAL', progress: 68, scene_id: 'current' }),
        scene({ access: 'LIMITED', progress: 0, scene_id: 'limited' }),
        scene({ access: 'OPEN', progress: 100, scene_id: 'open-1' }),
        scene({ access: 'OPEN', scene_id: 'open-2' })
      ]),
      modules
    })

    expect(result.stage).toBe('ENTITLED')
    expect(result.currentLearning.map((item) => item.sceneId)).toEqual(['current'])
    expect(result.entitledScenes.map((item) => item.sceneId)).toEqual(['limited'])
    expect(result.openScenes).toEqual([])
    expect(result.openReview).toEqual({ completedCount: 1, totalCount: 2 })
  })

  it('探索列表移除开放场景重复项，且只读卡不生成正文入口', () => {
    const result = presentCatalog({
      catalog: catalog([
        scene({ access: 'OPEN', scene_id: 'same-scene' }),
        scene({ access: 'PREVIEW', scene_id: 'same-scene' }),
        scene({ access: 'PREVIEW', scene_id: 'preview-only' }),
        scene({ access: 'HIDDEN', scene_id: 'hidden' })
      ]),
      modules
    })

    expect(result.previewScenes.map((item) => item.sceneId)).toEqual(['preview-only'])
    expect(result.previewScenes[0]).toMatchObject({ canOpen: false, entryUrl: null })
  })

  it('资料次级入口完全遵循服务端开关', () => {
    const result = presentCatalog({
      catalog: {
        ...catalog([scene({ access: 'PREVIEW', scene_id: 'preview-only' })]),
        profile_completion_enabled: true
      },
      modules
    })

    expect(result.showProfileAction).toBe(true)
  })
})
