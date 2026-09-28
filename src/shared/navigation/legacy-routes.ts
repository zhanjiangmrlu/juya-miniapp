import { type NavigationIntent, ROUTES } from './routes'

export interface LegacyRouteInput {
  pageId: string
  sceneId?: string
  sourceLocator?: string
}

function appendQuery(path: string, query: Record<string, string | undefined>) {
  const parameters = Object.entries(query)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  return parameters.length > 0 ? `${path}?${parameters.join('&')}` : path
}

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
