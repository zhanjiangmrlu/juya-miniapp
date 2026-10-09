import { CONTENT_ACCESS_LEVELS } from '@/shared/constants/entitlements'

import type { SceneSummary } from '@/shared/contracts/learning'
import type { HistoryItem, HistoryRow } from '@/shared/types/favorites'
export type { HistoryItem } from '@/shared/types/favorites'
export type { HistoryRow } from '@/shared/types/favorites'
/** 转换全部历史，items 为历史快照，catalog 为服务端当前访问目录 */
export const presentHistory = (items: HistoryItem[], catalog: SceneSummary[]): HistoryRow[] =>
  items.map((item) => {
    const scene = catalog.find((entry) => entry.scene_id === item.scene_id)
    const accessible = Boolean(scene && CONTENT_ACCESS_LEVELS.includes(scene.access))
    const parts = [item.completed_at ? '已完成' : '学习中']
    if (item.progress !== undefined && !item.completed_at) parts.push(`进度 ${item.progress}%`)
    if (item.favorite_count !== undefined) parts.push(`收藏 ${item.favorite_count} 条`)
    if (item.last_learned_at)
      parts.push(
        new Intl.DateTimeFormat('zh-CN', {
          month: 'numeric',
          day: 'numeric',
          timeZone: 'Asia/Shanghai'
        }).format(new Date(item.last_learned_at))
      )
    if (!accessible) parts.push('当前无权限 · 保留进度与收藏摘要')
    return {
      title: item.scene_title || scene?.chinese_title || scene?.title || item.scene_id,
      detail: parts.join(' · '),
      badge: accessible ? '可进入' : '仅摘要',
      route: accessible
        ? `/sub-packages/scene/detail?sceneId=${encodeURIComponent(item.scene_id)}`
        : null
    }
  })
