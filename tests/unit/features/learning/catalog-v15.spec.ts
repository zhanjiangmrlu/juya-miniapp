import { describe, expect, it } from 'vitest'

import { presentCatalog } from '@/features/learning/catalog-presenter'

describe('V1.5学习模块和阶段', () => {
  it.each(['NEW', null] as const)('权威阶段%s不被客户端旧进度提升为ENTITLED', (user_stage) => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        user_stage,
        authorization_pending: user_stage === null,
        items: [
          {
            scene_id: 'old',
            access: 'PREVIEW',
            progress: 100,
            chinese_title: '旧',
            title: 'Old',
            series: '',
            tags: []
          }
        ]
      }
    })
    expect(result.stage).toBe('NEW')
    expect(result.authorizationPending).toBe(user_stage === null)
  })
  it('保持服务端模块顺序及名称，不限制场景白名单', () => {
    const modules = ['short_reading', 'scene_learning', 'grammar', 'long_sentence'].map((key) => ({
      key,
      title: key,
      enabled: true,
      public_id: key
    }))
    expect(
      presentCatalog({ modules, catalog: { authorization_pending: false, items: [] } }).modules.map(
        (entry) => entry.key
      )
    ).toEqual(modules.map((entry) => entry.key))
  })
  it('服务端阶段在无当前权益卡时仍隐藏开放三卡重复主推荐', () => {
    const result = presentCatalog({
      modules: [],
      catalog: {
        authorization_pending: false,
        user_stage: 'ENTITLED',
        items: [
          {
            scene_id: 'open',
            access: 'OPEN',
            chinese_title: '开放',
            series: '',
            title: 'Open',
            tags: []
          }
        ]
      }
    })
    expect(result.openScenes).toEqual([])
    expect(result.openReview).toEqual({ totalCount: 1, completedCount: 0 })
  })
})
