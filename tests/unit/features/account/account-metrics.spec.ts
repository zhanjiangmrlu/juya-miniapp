import { describe, expect, it, vi } from 'vitest'

import { loadAccountMetrics } from '@/features/account/account-metrics'

describe('注销页真实统计', () => {
  it('累计全部收藏分页，只统计已完成场景并使用当前连续打卡天数', async () => {
    const runtime = {
      home: {
        getHome: async () => ({
          checkins: { total_days: 26, current_streak: 7, longest_streak: 19 }
        })
      },
      favorites: {
        list: vi
          .fn()
          .mockResolvedValueOnce({ items: [{ id: 'a' }, { id: 'b' }], next_cursor: 'next' })
          .mockResolvedValueOnce({ items: [{ id: 'b' }, { id: 'c' }], next_cursor: null })
      },
      client: {
        get: async () => ({
          items: [
            { scene_id: 'one', completed_at: '2026-10-01' },
            { scene_id: 'two', completed_at: null },
            { scene_id: 'three', completed_at: '2026-09-20' }
          ]
        })
      }
    }
    const result = await loadAccountMetrics(runtime as never)
    expect(result).toEqual({
      totalDays: 26,
      currentStreak: 7,
      favoriteCount: 3,
      completedScenes: 2
    })
    expect(runtime.favorites.list).toHaveBeenLastCalledWith('next')
  })
})
