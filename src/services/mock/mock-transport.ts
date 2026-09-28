import type { HttpTransport, TransportRequest, TransportResponse } from '../http/types'

import { MOCK_FIXTURES } from './fixtures'
const ROUTES: Record<string, unknown> = {
  'GET /api/v1/home': MOCK_FIXTURES.home,
  'GET /api/v1/learning/catalog': MOCK_FIXTURES.catalog,
  'GET /api/v1/learning/modules': MOCK_FIXTURES.modules,
  'GET /api/v1/me': MOCK_FIXTURES.user,
  'GET /api/v1/me/contact': MOCK_FIXTURES.contact,
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
                  : routeKey === 'GET /api/v1/favorites'
                    ? {
                        has_more: false,
                        items: [
                          {
                            entry_stable_id: 'word-evolved',
                            entry_type: 'VOCABULARY',
                            favorited_at: '2026-09-28T08:30:00Z',
                            id: 'favorite-evolved',
                            last_reviewed_at: null,
                            normalized_key: 'evolved',
                            sources: [
                              {
                                original_link: '/scenes/scene-castle#sentence-2',
                                scene_id: 'scene-castle',
                                sentence_snapshot: 'The castle evolved.',
                                source_locator: 'sentence-2'
                              }
                            ]
                          }
                        ],
                        next_cursor: null
                      }
                    : routeKey.match(/^GET \/api\/v1\/favorites\/[^/]+$/)
                      ? {
                          entry_stable_id: 'word-evolved',
                          entry_type: 'VOCABULARY',
                          favorited_at: '2026-09-28T08:30:00Z',
                          id: 'favorite-evolved',
                          last_reviewed_at: null,
                          normalized_key: 'evolved',
                          sources: [
                            {
                              original_link: '/scenes/scene-castle#sentence-2',
                              scene_id: 'scene-castle',
                              sentence_snapshot: 'The castle evolved.',
                              source_locator: 'sentence-2'
                            }
                          ]
                        }
                      : routeKey === 'GET /api/v1/history/scenes'
                        ? {
                            items: [
                              {
                                completed_at: '2026-09-28T08:40:00Z',
                                last_learned_at: '2026-09-28T08:40:00Z',
                                scene_id: 'scene-castle'
                              }
                            ]
                          }
                        : routeKey === 'POST /api/v1/reviews'
                          ? { card_count: 1, id: 'mock-review', started_at: '2026-09-28T08:30:00Z' }
                          : routeKey.match(/^POST \/api\/v1\/reviews\/[^/]+\/complete$/)
                            ? { completed_at: '2026-09-28T08:40:00Z', created: true }
                            : routeKey === 'PUT /api/v1/me/contact'
                              ? { ...MOCK_FIXTURES.contact, ...(request.body as object) }
                              : routeKey === 'DELETE /api/v1/me/contact'
                                ? null
                                : routeKey === 'POST /api/v1/me/contact/corrections'
                                  ? {
                                      created_at: '2026-09-28T08:30:00Z',
                                      id: 'mock-correction',
                                      status: 'PENDING'
                                    }
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
