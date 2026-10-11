import { describe, expect, it } from 'vitest'

import { presentHistory } from '@/features/favorites/history-presenter'
describe('学习历史权限', () => {
  it('开放历史只使用明确来源或当前开放目录，缺失和非开放目录不能猜测', () => {
    const items = ['saved-open', 'catalog-open', 'formal', 'limited', 'unknown'].map(
      (scene_id) => ({
        scene_id,
        source_type: scene_id === 'saved-open' ? 'OPEN' : 'SCENE',
        completed_at: null,
        last_learned_at: ''
      })
    )
    const catalog = [
      { scene_id: 'catalog-open', access: 'OPEN' as const },
      { scene_id: 'formal', access: 'FORMAL' as const },
      { scene_id: 'limited', access: 'LIMITED' as const }
    ].map((scene) => ({ ...scene, chinese_title: '', title: scene.scene_id, series: '', tags: [] }))
    const rows = presentHistory(items, catalog, { openOnly: true })
    expect(rows.map((row) => row.title)).toEqual(['saved-open', 'catalog-open'])
    expect(rows[0]?.route).toBeNull()
    expect(rows[1]?.route).toContain('sceneId=catalog-open')
  })
  it('权限未确认时明确OPEN历史仍保留安全摘要，未确认目录不能分类或授权', () => {
    const items = ['saved-open', 'pending-open'].map((scene_id) => ({
      scene_id,
      source_type: scene_id === 'saved-open' ? 'OPEN' : 'SCENE',
      completed_at: null,
      last_learned_at: '',
      progress: 42,
      favorite_count: 3
    }))
    const catalog = items.map((item) => ({
      scene_id: item.scene_id,
      access: 'OPEN' as const,
      chinese_title: '',
      title: '',
      series: '',
      tags: []
    }))
    const rows = presentHistory(items, catalog, { openOnly: true, authorizationPending: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ title: 'saved-open', route: null, badge: '仅摘要' })
    expect(rows[0]?.detail).toContain('42%')
    expect(rows[0]?.detail).toContain('收藏 3 条')
  })
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
      route: '/sub-packages/scene/detail?sceneId=open',
      badge: '可进入'
    })
    expect(result[1]).toMatchObject({ title: '旅行英语', route: null, badge: '仅摘要' })
    expect(result[1]?.detail).toContain('36%')
  })
})
