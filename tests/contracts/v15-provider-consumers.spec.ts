import { describe, expect, it, vi } from 'vitest'

import { createPronunciationService } from '@/features/audio/pronunciation-service'
import { createFavoriteService } from '@/features/favorites/favorite-service'
import { adaptFavoriteSnapshot } from '@/features/favorites/favorite-snapshot-response'
import { presentSourceResolution } from '@/features/favorites/source-resolution'
import { createSceneService } from '@/features/scene/scene-service'
import { createShortReadingService } from '@/features/short-reading/short-reading-service'
import { createSessionService } from '@/services/auth/session-service'
import { createHttpClient } from '@/services/http/client'

import type { components } from '../fixtures/contracts/v15-3f9207a/provider'
import type { TransportRequest } from '@/shared/types/http'

import examples from '../fixtures/contracts/v15-3f9207a/examples.json'
import openapi from '../fixtures/contracts/v15-3f9207a/openapi.json'

const snapshot: components['schemas']['FavoriteSnapshotResponse'] = {
  ...examples['收藏响应'],
  content_type: 'dialogue',
  entry_type: 'word',
  schema_version: 2
}
const reading: components['schemas']['ReadingDetail'] = {
  ...examples['短文正文响应'],
  content_type: 'short_reading',
  schema_version: 2,
  access: 'TRIAL'
}
const published = {
  content_id: 'example-scene',
  content_type: 'dialogue' as const,
  content_version: 2,
  revision_id: 'example-revision',
  schema_version: 2 as const,
  title_en: 'Example',
  title_zh: '示例',
  dialogue: [
    {
      sentence_id: 'example-sentence',
      speaker: 'Ivy',
      english: 'I have a cup.',
      chinese: '我有一个杯子。',
      position: 1,
      start_ms: 0,
      end_ms: 1000,
      slice_target_id: 'example-slice',
      slice_version: 'example-slice-version'
    }
  ],
  words: [
    {
      entry_id: 'example-entry',
      entry_type: 'word' as const,
      entry_version: 1,
      phonetic: '',
      legacy_incomplete: false,
      sense_id: 'example-sense',
      source_id: 'example-source',
      english: 'cup',
      meaning_zh: '杯子',
      explanation: '',
      source_sentence: 'I have a cup.',
      source_locator: { sentence_id: 'example-sentence' },
      is_favorited: false,
      favorite_id: null,
      pronunciation: { target_id: 'example-word-audio', resource_version: null, can_prepare: true }
    }
  ],
  chunks: [],
  whole_audio: {
    target_id: 'example-whole',
    resource_version: 'example-whole-version',
    duration_ms: 1000
  }
} satisfies components['schemas']['SceneDetail']

describe('BFF 3f9207a已提交消费者契约', () => {
  it('直接接收提供方TS类型、真实平铺示例及历史nullable版本', () => {
    expect(adaptFavoriteSnapshot(snapshot)).toMatchObject({
      id: 'example-favorite',
      chinese: '杯子'
    })
    const legacy: components['schemas']['FavoriteSnapshotResponse'] = {
      ...snapshot,
      content_type: 'SCENE',
      content_version: null,
      saved_content_version: null,
      revision_id: null,
      legacy_incomplete: true,
      missing_fields: ['meaning_zh'],
      meaning_zh: '',
      pronunciation: null
    }
    expect(adaptFavoriteSnapshot(legacy)).toMatchObject({
      content_version: null,
      saved_content_version: null,
      chinese: '',
      pronunciation: null,
      legacy_incomplete: true
    })
  })
  it('历史SCENE只按重新鉴权的当前版本定位，NO_ACCESS不生成入口', () => {
    const exact: components['schemas']['FavoriteSourceResolutionResponse'] = {
      ...examples['来源无权限响应'],
      content_type: 'SCENE',
      status: 'EXACT',
      saved_content_version: null,
      target_content_version: 3,
      locator: { sentence_id: 'current-sentence' }
    }
    expect(presentSourceResolution(exact).route).toBe(
      '/sub-packages/scene/detail?sceneId=example-scene&sourceLocator=current-sentence&contentVersion=3'
    )
    expect(
      presentSourceResolution({
        ...exact,
        status: 'NO_ACCESS',
        target_content_version: null,
        locator: null
      }).route
    ).toBeNull()
  })
  it('真实公共路径与JSON/query白名单消费，prepare/轮询不传内部字段', async () => {
    const requests: TransportRequest[] = []
    const client = createHttpClient({
      baseUrl: 'https://contract.example.test',
      clientVersion: '1.5',
      session: {
        getAccessToken: () => 'fixture-token',
        refresh: async () => undefined,
        clear: vi.fn()
      },
      transport: {
        request: async <T>(request: (typeof requests)[number]) => {
          requests.push(request)
          const url = new URL(request.url)
          const signed = {
            resource_id: 'example-audio',
            url: 'https://media.example.test/audio',
            expires_at: '2099-01-01T00:00:00Z'
          }
          let data: unknown = snapshot
          if (url.pathname.startsWith('/api/v1/short-readings')) {
            data = url.pathname.endsWith('/progress')
              ? reading.progress
              : url.pathname.endsWith('/complete')
                ? {
                    progress: { ...reading.progress, completed_at: '2026-10-11T04:01:00Z' },
                    created: true
                  }
                : reading
          }
          if (url.pathname.includes('/signed-url')) data = signed
          if (/\/scenes\/[^/]+\/open$/.test(url.pathname))
            data = {
              access: 'OPEN',
              sources: ['OPEN'],
              activated_at: null,
              earliest_expires_at: null,
              authorization_pending: false,
              scene: published
            }
          if (url.pathname.includes('/pronunciations')) data = examples['发音准备响应']
          if (url.pathname.endsWith('/source-resolution')) data = examples['来源无权限响应']
          if (url.pathname === '/api/v1/favorite-snapshots' && request.method === 'GET')
            data = { items: [snapshot], has_more: false, next_cursor: null }
          if (request.method === 'DELETE')
            data = { favorite_id: snapshot.favorite_id, active: false, snapshot_version: 1 }
          if (url.pathname.startsWith('/api/v1/reviews'))
            data = { id: 'example-review', card_count: 1, started_at: '2026-10-11T04:01:00Z' }
          if (url.pathname.startsWith('/api/v1/session'))
            data = {
              access_token: 'fixture-token',
              refresh_token: 'fixture-refresh',
              refresh_expires_at: '2099-01-01T00:00:00Z',
              session_id: 'example-session',
              user: { public_id: 'example-user', juya_number: 'example-number', status: 'active' },
              account_summary: {}
            }
          return { status: 200, headers: {}, data: data as T }
        }
      }
    })
    const favorites = createFavoriteService(client)
    await favorites.create(
      {
        content_type: 'dialogue',
        content_id: 'example-scene',
        content_version: 2,
        entry_id: 'example-entry',
        sense_id: 'example-sense',
        source_id: 'example-source'
      },
      'fixture-create-key'
    )
    const pronunciation = createPronunciationService(client)
    const target = {
      target_id: 'example-word-audio',
      resource_version: 'example-version',
      can_prepare: true
    }
    await pronunciation.resolve(target, { favorite_id: 'example-favorite' })
    await pronunciation.task('example-task', { favorite_id: 'example-favorite' }, target)
    expect(
      (await createShortReadingService(client).open('example-reading')).paragraphs_en[0]
    ).toEqual({ paragraph_id: 'example-paragraph', text: 'It is a new day.' })
    await favorites.list('opaque-cursor')
    await favorites.get('example-favorite')
    await favorites.remove('example-favorite', 'fixture-remove-key')
    await favorites.resolveSource('example-favorite')
    await favorites.createReview(['example-favorite'], 'fixture-review-key')
    await favorites.completeReview('example-review', 'fixture-complete-key')
    const shortReading = createShortReadingService(client)
    await shortReading.savePosition('example-reading', examples['短文进度请求'])
    await shortReading.complete('example-reading', 2, 'fixture-reading-key')
    const session = createSessionService(client)
    expect(await session.loginWithWechat('example-code')).toHaveProperty(
      'session_id',
      'example-session'
    )
    await session.refresh('fixture-refresh')
    await createSceneService(client).getResource(
      'example-scene',
      'example-resource',
      'example-revision'
    )
    const opened = await createSceneService(client).open('example-scene')
    expect(opened.scene?.entries[0].audio).toMatchObject({
      target_id: 'example-slice',
      version_id: 'example-slice-version'
    })
    expect(opened.scene?.entries[1].pronunciation?.resource_version).toBeUndefined()
    for (const request of requests) {
      const url = new URL(request.url)
      const path = Object.keys(openapi.paths).find((candidate) =>
        new RegExp(`^${candidate.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(url.pathname)
      )
      expect(path, url.pathname).toBeDefined()
      const operation = (
        openapi.paths as Record<
          string,
          Record<
            string,
            {
              parameters?: { in: string; name: string; required: boolean }[]
              requestBody?: { content: { 'application/json': { schema: { $ref: string } } } }
            }
          >
        >
      )[path!][request.method.toLowerCase()]
      expect(operation).toBeDefined()
      const allowedQuery =
        operation.parameters
          ?.filter((parameter) => parameter.in === 'query')
          .map((parameter) => parameter.name) ?? []
      expect([...url.searchParams.keys()].every((name) => allowedQuery.includes(name))).toBe(true)
      const schemaName = operation.requestBody?.content['application/json'].schema.$ref
        .split('/')
        .pop()
      if (schemaName) {
        const schema = (
          openapi.components.schemas as Record<
            string,
            { properties: Record<string, unknown>; required?: string[] }
          >
        )[schemaName]
        const body = JSON.parse(JSON.stringify(request.body)) as Record<string, unknown>
        expect(
          Object.keys(body).every((name) =>
            Object.prototype.hasOwnProperty.call(schema.properties, name)
          )
        ).toBe(true)
        expect((schema.required ?? []).every((name) => name in body)).toBe(true)
      } else expect(request.body).toBeUndefined()
      if (url.pathname.startsWith('/api/v1/session'))
        expect(request.headers.Authorization).toBeUndefined()
      else expect(request.headers.Authorization).toBe('Bearer fixture-token')
    }
    expect(requests[0].headers['Idempotency-Key']).toBe('fixture-create-key')
    expect(new URL(requests[2].url).searchParams.get('target_id')).toBe(target.target_id)
  })
})
