import { describe, expect, it } from 'vitest'

import { presentHistory } from './history-presenter'
describe('学习历史权限', () => {
  it('保留无权限历史和收藏摘要，只有当前可学习场景产生正文路由', () => {
    const result = presentHistory(
      [
        {
          scene_id: 'open',
          scene_title: '开放',
          completed_at: '2026-10-01',
          last_learned_at: '2026-10-01',
          favorite_count: 5
        },
        {
          scene_id: 'old',
          scene_title: '旅行英语',
          completed_at: null,
          last_learned_at: '2026-09-29',
          progress: 36
        }
      ],
      [
        {
          scene_id: 'open',
          chinese_title: '开放',
          title: 'open',
          access: 'OPEN',
          series: '',
          tags: []
        }
      ]
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      title: '开放',
      route: '/pages/scene/detail?sceneId=open',
      badge: '可进入'
    })
    expect(result[1]).toMatchObject({ title: '旅行英语', route: null, badge: '仅摘要' })
    expect(result[1]?.detail).toContain('36%')
  })
})
