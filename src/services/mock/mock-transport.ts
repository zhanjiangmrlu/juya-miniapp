import type { HttpTransport, TransportRequest, TransportResponse } from '../http/types'

import { MOCK_FIXTURES } from './fixtures'
const MOCK_FEEDBACK = {
  category: 'CONTENT',
  created_at: '2026-09-28T08:30:00Z',
  description: 'Castle Exhibit 第二句的中文释义似乎不准确。',
  id: 'feedback-001',
  reopen_count: 0,
  reply: '已核对并修正释义，感谢你的反馈。',
  resolved_at: '2026-09-28T10:30:00Z',
  screenshots: [],
  status: 'RESOLVED',
  supplements: [],
  title: 'Castle Exhibit 第二句释义'
}
const ROUTES: Record<string, unknown> = {
  'GET /api/v1/feedback': { has_more: false, items: [MOCK_FEEDBACK] },
  'GET /api/v1/home': MOCK_FIXTURES.home,
  'GET /api/v1/learning/catalog': MOCK_FIXTURES.catalog,
  'GET /api/v1/learning/modules': MOCK_FIXTURES.modules,
  'GET /api/v1/me': MOCK_FIXTURES.user,
  'GET /api/v1/me/contact': MOCK_FIXTURES.contact,
  'GET /api/v1/me/entitlements': {
    authorization_pending: false,
    formal: [
      {
        content_pack_id: 'pack-1',
        effective_at: '2026-09-01T00:00:00Z',
        expires_at: null,
        id: 'formal-1',
        status: 'ACTIVE',
        title: '正式内容包'
      }
    ],
    limited: [
      {
        activated_at: null,
        activity_id: 'activity-1',
        duration_days: 3,
        expires_at: null,
        id: 'limited-1',
        scene_count: 3,
        starts_before: '2026-10-01T08:00:00Z',
        status: 'PENDING',
        title: '3 天限时学习'
      }
    ],
    version: 'v1'
  },
  'GET /api/v1/messages': {
    items: [
      {
        created_at: '2026-09-28T10:30:00Z',
        id: 'message-1',
        read_at: null,
        related_id: 'feedback-001',
        related_type: 'FEEDBACK',
        summary: 'Castle Exhibit 第二句释义已核对处理。',
        title: '你的问题已有处理结果',
        type: 'SYSTEM'
      }
    ],
    next_cursor: null
  },
  'DELETE /api/v1/me/learning-data': null,
  'POST /api/v1/me/deletion': {
    completed_at: null,
    effective_at: '2026-10-05T08:30:00Z',
    id: 'deletion-1',
    requested_at: '2026-09-28T08:30:00Z',
    revoked_at: null,
    status: 'PENDING'
  },
  'POST /api/v1/me/deletion/revoke': {
    completed_at: null,
    effective_at: '2026-10-05T08:30:00Z',
    id: 'deletion-1',
    requested_at: '2026-09-28T08:30:00Z',
    revoked_at: '2026-09-28T11:30:00Z',
    status: 'REVOKED'
  },
  'POST /api/v1/feedback': { ...MOCK_FEEDBACK, id: 'feedback-created', status: 'PENDING' },
  'POST /api/v1/feedback/uploads': {
    fields: {
      key: 'feedback/mock-user/mock-image.jpg',
      policy: 'mock-policy',
      'Content-Type': 'image/jpeg',
      'x-oss-signature-version': 'OSS4-HMAC-SHA256',
      'x-oss-signature': 'mock-signature'
    },
    access_key_id: 'mock-access-key',
    content_type: 'image/jpeg',
    expires_at: '2026-09-28T08:35:00Z',
    host: 'https://mock-upload.juya.local',
    key: 'feedback/mock-user/mock-image.jpg',
    max_bytes: 5242880,
    policy: 'mock-policy',
    signature: 'mock-signature'
  },
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
    const hasStaticFixture = Object.prototype.hasOwnProperty.call(ROUTES, routeKey)
    const staticFixture = hasStaticFixture ? ROUTES[routeKey] : undefined
    const configuredFixture =
      staticFixture !== undefined || hasStaticFixture
        ? staticFixture
        : routeKey.match(/^POST \/api\/v1\/scenes\/[^/]+\/open$/)
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
                            ? {
                                card_count: 1,
                                id: 'mock-review',
                                started_at: '2026-09-28T08:30:00Z'
                              }
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
                                    : routeKey.match(/^GET \/api\/v1\/feedback\/[^/]+$/)
                                      ? MOCK_FEEDBACK
                                      : routeKey.match(
                                            /^POST \/api\/v1\/feedback\/[^/]+\/supplements$/
                                          )
                                        ? {
                                            ...MOCK_FEEDBACK,
                                            status: 'SUPPLEMENTED',
                                            supplements: [
                                              {
                                                created_at: '2026-09-28T11:00:00Z',
                                                text: (request.body as { text: string }).text
                                              }
                                            ]
                                          }
                                        : routeKey.match(
                                              /^POST \/api\/v1\/feedback\/[^/]+\/resolution$/
                                            )
                                          ? {
                                              ...MOCK_FEEDBACK,
                                              reopen_count:
                                                (request.body as { action: string }).action ===
                                                'REOPEN'
                                                  ? 1
                                                  : 0,
                                              status:
                                                (request.body as { action: string }).action ===
                                                'REOPEN'
                                                  ? 'REOPENED'
                                                  : 'RESOLVED'
                                            }
                                          : routeKey.match(
                                                /^POST \/api\/v1\/messages\/[^/]+\/read$/
                                              )
                                            ? {
                                                ...(
                                                  ROUTES['GET /api/v1/messages'] as {
                                                    items: object[]
                                                  }
                                                ).items[0],
                                                read_at: '2026-09-28T11:00:00Z'
                                              }
                                            : undefined
    const fixture =
      routeKey === 'POST /api/v1/feedback'
        ? { ...(configuredFixture as object), ...(request.body as object) }
        : configuredFixture
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
