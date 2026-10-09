import { MOCK_FEEDBACK, MOCK_ROUTES as ROUTES } from '@/services/mock/mock-data'
import { AccessLevel } from '@/shared/enums/entitlements'
import { FeedbackResolutionAction, FeedbackStatus } from '@/shared/enums/feedback'
import { HttpMethod } from '@/shared/enums/http'
import { SceneEntryType } from '@/shared/enums/learning'

import type { HttpTransport, TransportRequest, TransportResponse } from '@/shared/types/http'
import type { MockActionRequest, MockItemsResponse, MockTextRequest } from '@/shared/types/mock'

import { MOCK_FIXTURES } from './fixtures'
import publishedScene from './published-scene.json'

/** 复制 JSON 接口样本，兼容没有 structuredClone 的微信运行时 */
const copyResponse = <T>(response: unknown): T => JSON.parse(JSON.stringify(response)) as T

export class MockTransport implements HttpTransport {
  private promptExposed = false
  /** 按请求方法与路径返回隔离副本，未配置接口明确返回标准 404 错误。 */
  async request<T>(request: TransportRequest): Promise<TransportResponse<T>> {
    const url = new URL(request.url)
    const routeKey = `${request.method} ${url.pathname}`
    const scene = publishedScene.scene
    let fixture: unknown
    if (routeKey === 'POST /api/v1/scenes/scene-coffee-shop/open') fixture = publishedScene
    if (routeKey === 'POST /api/v1/scenes/scene-weekend-trip/open')
      fixture = {
        ...publishedScene,
        access: AccessLevel.PREVIEW,
        sources: [],
        scene: {
          public_id: 'scene-weekend-trip',
          title: '周末公路旅行',
          title_en: 'A Weekend Road Trip',
          title_zh: '周末公路旅行',
          cover_url: '/static/home/coffee-home.png',
          introduction: '可查看主题、难度与简介',
          preview_status: 'PREVIEW'
        }
      }
    if (
      request.method === HttpMethod.GET &&
      /\/scenes\/scene-coffee-shop\/resources\/[^/]+\/signed-url$/.test(url.pathname)
    ) {
      const resourceId = decodeURIComponent(url.pathname.split('/')[6] ?? '')
      fixture = {
        resource_id: resourceId,
        expires_at: '2099-01-01T00:00:00Z',
        url:
          resourceId.includes('original') || resourceId.includes('cover')
            ? '/static/fixtures/coffee-original.png'
            : '/static/fixtures/silence.wav'
      }
    }
    if (
      request.method === HttpMethod.GET &&
      /\/scenes\/scene-coffee-shop\/entries\/[^/]+$/.test(url.pathname)
    ) {
      const entryId = decodeURIComponent(url.pathname.split('/')[6] ?? '')
      const entry = [...scene.content.vocabulary, ...scene.content.chunks].find(
        (item) => item.entry_id === entryId
      )
      if (entry)
        fixture = {
          ...entry,
          scene_id: scene.scene_id,
          revision_id: scene.revision_id,
          source_locator: url.searchParams.get('source_locator'),
          sentence_snapshot: scene.content.dialogue
            .filter((sentence) => entry.source_sentence_ids.includes(sentence.id))
            .map((sentence) => sentence.english)
            .join('\n')
        }
    }
    if (routeKey === 'POST /api/v1/me/contact/prompt-exposures') {
      fixture = { created: !this.promptExposed }
      this.promptExposed = true
    }
    if (fixture !== undefined) return { data: copyResponse<T>(fixture), status: 200, headers: {} }
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
                              entry_type: SceneEntryType.VOCABULARY,
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
                            entry_type: SceneEntryType.VOCABULARY,
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
                                            status: 'USER_SUPPLIED',
                                            supplements: [
                                              {
                                                created_at: '2026-09-28T11:00:00Z',
                                                text: (request.body as MockTextRequest).text
                                              }
                                            ]
                                          }
                                        : routeKey.match(
                                              /^POST \/api\/v1\/feedback\/[^/]+\/resolution$/
                                            )
                                          ? {
                                              ...MOCK_FEEDBACK,
                                              reopen_count:
                                                (request.body as MockActionRequest).action ===
                                                FeedbackResolutionAction.REOPEN
                                                  ? 1
                                                  : 0,
                                              status:
                                                (request.body as MockActionRequest).action ===
                                                FeedbackResolutionAction.REOPEN
                                                  ? FeedbackStatus.REOPENED
                                                  : FeedbackStatus.RESOLVED
                                            }
                                          : routeKey.match(
                                                /^POST \/api\/v1\/messages\/[^/]+\/read$/
                                              )
                                            ? {
                                                ...(
                                                  ROUTES[
                                                    'GET /api/v1/messages'
                                                  ] as MockItemsResponse
                                                ).items[0],
                                                read_at: '2026-09-28T11:00:00Z'
                                              }
                                            : undefined
    const responseFixture =
      routeKey === 'POST /api/v1/feedback'
        ? { ...(configuredFixture as object), ...(request.body as object) }
        : configuredFixture
    if (responseFixture === undefined) {
      return {
        data: { code: 'MOCK_ROUTE_NOT_FOUND', message: `未配置 ${url.pathname}` } as T,
        headers: {},
        status: 404
      }
    }
    return { data: copyResponse<T>(responseFixture), headers: {}, status: 200 }
  }
}
