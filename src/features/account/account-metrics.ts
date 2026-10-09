import type { AccountLearningHistoryResponse } from '@/shared/types/account'
import type { RuntimeServices } from '@/shared/types/runtime'
/** 读取注销挽留统计，runtime 为当前用户的真实接口服务 */
export const loadAccountMetrics = async (runtime: RuntimeServices) => {
  const [home, history] = await Promise.all([
    runtime.home.getHome(),
    runtime.client.get<AccountLearningHistoryResponse>('/api/v1/history/scenes')
  ])
  const ids = new Set<string>()
  const cursors = new Set<string>()
  let cursor: string | undefined
  do {
    const response = await runtime.favorites.list(cursor)
    response.items.forEach((item) => ids.add(item.id))
    cursor = response.next_cursor || undefined
    if (cursor && cursors.has(cursor)) throw new Error('收藏分页未前进')
    if (cursor) cursors.add(cursor)
  } while (cursor)
  return {
    totalDays: home.checkins.total_days,
    currentStreak: home.checkins.current_streak,
    favoriteCount: ids.size,
    completedScenes: new Set(
      history.items.filter((item) => item.completed_at).map((item) => item.scene_id)
    ).size
  }
}
