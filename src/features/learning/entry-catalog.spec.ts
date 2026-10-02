import { describe, expect, it } from 'vitest'

import type { SceneSummary } from '@/shared/contracts/learning'

import { presentCatalog } from './catalog-presenter'
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
