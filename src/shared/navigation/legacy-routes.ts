import { ROUTES } from '@/shared/constants/navigation'

import type { LegacyRouteInput, NavigationIntent } from '@/shared/types/navigation'

export type { LegacyRouteInput } from '@/shared/types/navigation'

/** 将有效查询参数安全编码后追加到目标路径。 */
function appendQuery(path: string, query: Record<string, string | undefined>) {
  const parameters = Object.entries(query)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  return parameters.length > 0 ? `${path}?${parameters.join('&')}` : path
}

/** 将旧版页面编号映射为 V1.3 的唯一导航意图，集中承接历史入口。 */
export function resolveLegacyRoute(input: LegacyRouteInput): NavigationIntent {
  if (input.pageId === 'M04') {
    return { type: 'reLaunch', url: appendQuery(ROUTES.home, { networkError: '1' }) }
  }

  if (input.pageId === 'M10' || input.pageId === 'M11') {
    return {
      type: 'redirectTo',
      url: appendQuery(ROUTES.sceneDialogue, {
        sceneId: input.sceneId,
        sourceLocator: input.sourceLocator,
        sheet: input.pageId === 'M10' ? 'vocabulary' : 'phrase'
      })
    }
  }

  if (input.pageId === 'M26') {
    return { type: 'reLaunch', url: ROUTES.profile }
  }

  return { type: 'reLaunch', url: ROUTES.home }
}
