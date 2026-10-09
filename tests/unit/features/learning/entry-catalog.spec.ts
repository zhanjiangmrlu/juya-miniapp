import { describe, expect, it } from 'vitest'

import { presentCatalog } from '@/features/learning/catalog-presenter'

import type { SceneSummary } from '@/shared/contracts/learning'
/** 构造摘要，access 为访问级别，scene_id 为后台稳定标识 */
const scene = (access: SceneSummary['access'], scene_id: string, progress = 0): SceneSummary => ({
  access,
  scene_id,
  progress,
  chinese_title: '场景',
  title: 'Scene',
  series: '日常英语',
  tags: []
})
describe('入口目录权限与继续学习', () => {
  it('已完成非开放内容到期后，缺少百分比仍保留权益用户布局', () => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        authorization_pending: false,
        items: [
          scene('OPEN', 'open'),
          { ...scene('PREVIEW', 'expired'), progress: undefined, status: 'COMPLETED' }
        ]
      }
    })
    expect(result.stage).toBe('ENTITLED')
    expect(result.openScenes).toEqual([])
    expect(result.openReview).toEqual({ completedCount: 0, totalCount: 1 })
    expect(result.previewScenes[0]?.entryUrl).toBeNull()
  })
  it('完成状态缺少百分比时仍展示已完成进度，并计入开放复习摘要', () => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        authorization_pending: false,
        items: [
          { ...scene('FORMAL', 'done'), progress: undefined, status: 'COMPLETED' },
          { ...scene('OPEN', 'open-done'), progress: undefined, status: 'COMPLETED' }
        ]
      }
    })
    expect(result.entitledScenes[0]?.progress).toBe(100)
    expect(result.currentLearning).toEqual([])
    expect(result.openReview).toEqual({ completedCount: 1, totalCount: 1 })
  })
  it('已完成内容不作为继续学习任务', () => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        authorization_pending: false,
        items: [scene('FORMAL', 'done', 100), scene('FORMAL', 'ongoing', 68)]
      }
    })
    expect(result.currentLearning.map((item) => item.sceneId)).toEqual(['ongoing'])
    expect(result.entitledScenes.map((item) => item.sceneId)).toEqual(['done'])
  })
  it('探索预览排除所有可访问内容的重复ID', () => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        authorization_pending: false,
        items: [scene('FORMAL', 'same'), scene('PREVIEW', 'same'), scene('PREVIEW', 'only')]
      }
    })
    expect(result.previewScenes.map((item) => item.sceneId)).toEqual(['only'])
  })
  it('已经开始非开放内容后继续采用权益优先列表', () => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        authorization_pending: false,
        items: [scene('OPEN', 'open'), scene('PREVIEW', 'expired', 68)]
      }
    })
    expect(result.stage).toBe('ENTITLED')
    expect(result.openScenes).toEqual([])
    expect(result.previewScenes[0]?.entryUrl).toBeNull()
  })
})
