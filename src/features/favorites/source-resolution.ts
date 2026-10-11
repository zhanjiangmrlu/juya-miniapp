import { FavoriteSourceStatus } from '@/shared/enums/favorites'

import type { FavoriteSourceResolution } from '@/shared/contracts/favorites'

/** 只生成服务端授权的当前版本入口，resolution 为重新鉴权后的来源解析 */
export const presentSourceResolution = (resolution: FavoriteSourceResolution) => {
  if (
    ![FavoriteSourceStatus.EXACT, FavoriteSourceStatus.UPDATED_OR_UNRESOLVED].includes(
      resolution.status as never
    ) ||
    !Number.isInteger(resolution.target_content_version) ||
    (resolution.target_content_version || 0) < 1 ||
    !['dialogue', 'word_card', 'short_reading', 'SCENE'].includes(resolution.content_type)
  ) {
    return { route: null, message: '当前无原文访问权限，已保存的收藏仍可复习' }
  }
  const page = resolution.content_type === 'short_reading' ? 'short-reading' : 'scene'
  const parameter = page === 'scene' ? 'sceneId' : 'contentId'
  const base = `/sub-packages/${page}/detail?${parameter}=${encodeURIComponent(resolution.content_id)}`
  const resolvedLocator =
    typeof resolution.locator === 'string'
      ? resolution.locator
      : page === 'scene'
        ? resolution.locator?.sentence_id
        : resolution.locator?.paragraph_id
  const exact = resolution.status === FavoriteSourceStatus.EXACT && Boolean(resolvedLocator)
  const locator = exact ? `&sourceLocator=${encodeURIComponent(resolvedLocator!)}` : ''
  return {
    route: `${base}${locator}&contentVersion=${resolution.target_content_version}`,
    message: exact ? '' : '来源内容已更新'
  }
}
