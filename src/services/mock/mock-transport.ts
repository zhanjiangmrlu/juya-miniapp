import type { HttpTransport, TransportRequest, TransportResponse } from '../http/types'

import { MOCK_FIXTURES } from './fixtures'
const ROUTES: Record<string, unknown> = {
  'GET /api/v1/home': MOCK_FIXTURES.home,
  'GET /api/v1/learning/catalog': MOCK_FIXTURES.catalog,
  'GET /api/v1/learning/modules': MOCK_FIXTURES.modules,
  'GET /api/v1/me': MOCK_FIXTURES.user,
  'POST /api/v1/session/refresh': {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token'
  },
  'POST /api/v1/session/wechat': {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token'
  }
}
export class MockTransport implements HttpTransport {
  /** 按请求方法与路径返回隔离副本，未配置接口明确返回标准 404 错误。 */
  async request<T>(request: TransportRequest): Promise<TransportResponse<T>> {
    const url = new URL(request.url)
    const routeKey = `${request.method} ${url.pathname}`
    const fixture =
      ROUTES[routeKey] ??
      (routeKey.match(/^POST \/api\/v1\/scenes\/[^/]+\/open$/)
        ? MOCK_FIXTURES.scene
        : routeKey.match(/^POST \/api\/v1\/media\/[^/]+\/signed-url$/)
          ? MOCK_FIXTURES.signedMedia
          : routeKey.match(/^PUT \/api\/v1\/scenes\/[^/]+\/progress$/)
            ? { ...(request.body as object), scene_id: 'scene-castle' }
            : routeKey.match(/^POST \/api\/v1\/scenes\/[^/]+\/complete$/)
              ? { checkin_date: '2026-09-28', created: true, progress: {} }
              : routeKey.match(/^GET \/api\/v1\/scenes\/[^/]+\/result$/)
                ? {
                    completed_scenes: 1,
                    favorite_phrases: 3,
                    favorite_vocabulary: 6,
                    streak_days: 12
                  }
                : routeKey.match(/^POST \/api\/v1\/favorites$/)
                  ? { ...(request.body as object), id: 'mock-favorite' }
                  : undefined)
    if (fixture === undefined) {
      return {
        data: { code: 'MOCK_ROUTE_NOT_FOUND', message: `未配置 ${url.pathname}` } as T,
        headers: {},
        status: 404
      }
    }
    return { data: structuredClone(fixture) as T, headers: {}, status: 200 }
  }
}
