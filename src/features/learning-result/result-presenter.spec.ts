import { describe, expect, it } from 'vitest'

import { presentLearningResult } from './result-presenter'

describe('presentLearningResult', () => {
  it('三张成果卡使用固定明细目标', () => {
    const result = presentLearningResult({
      completed_scenes: 1,
      favorite_phrases: 3,
      favorite_vocabulary: 6,
      streak_days: 12
    })

    expect(result.cards).toEqual([
      { label: '完成场景', route: '/pages/favorites/history', value: 1 },
      { label: '收藏词汇', route: '/pages/favorites/index?tab=vocabulary', value: 6 },
      { label: '收藏语块', route: '/pages/favorites/index?tab=phrases', value: 3 }
    ])
  })

  it('无成果数据时显示 0 且仍保留明细入口', () => {
    const result = presentLearningResult(null)

    expect(result.cards.map((card) => card.value)).toEqual([0, 0, 0])
    expect(result.cards.every((card) => card.route.length > 0)).toBe(true)
  })
})
