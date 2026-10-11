import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAudioCancellation } from '@/features/audio/audio-cancellation'
import { resolvePronunciation } from '@/features/audio/pronunciation-controller'
import { createPronunciationService } from '@/features/audio/pronunciation-service'
import { createHttpClient } from '@/services/http/client'

import type { HttpTransport, TransportRequest } from '@/shared/types/http'

afterEach(() => vi.useRealTimers())

/** 按BFF公共PronunciationRequest/Query建立严格fixture，只返回引用校验后的任务和资源 */
const createFixture = () => {
  const requests: TransportRequest[] = []
  const allowed = new Set([
    'favorite_id',
    'content_type',
    'content_id',
    'content_version',
    'entry_id',
    'sense_id',
    'source_id',
    'resource_version'
  ])
  const transport: HttpTransport = {
    request: async <T>(request: TransportRequest) => {
      requests.push(request)
      const url = new URL(request.url)
      let data: unknown
      if (request.method === 'POST') {
        const body = request.body as Record<string, unknown>
        if (Object.keys(body).some((key) => !allowed.has(key)))
          throw new Error('PronunciationRequest rejects extra fields')
        expect(body).toMatchObject({ favorite_id: 'owned', resource_version: 'v2' })
        data = {
          status: 'PREPARING',
          task_id: 'task-1',
          url: null,
          resource_version: null,
          can_retry: false,
          code: null,
          expires_at: null
        }
      } else {
        expect(url.pathname).toBe('/api/v1/pronunciations/tasks/task-1')
        expect(url.searchParams.get('favorite_id')).toBe('owned')
        expect(url.searchParams.get('target_id')).toBe('controlled-target')
        expect(url.searchParams.get('resource_version')).toBe('v2')
        data = {
          status: 'READY',
          task_id: 'task-1',
          url: 'https://media.example.test/signed',
          resource_version: 'v2',
          can_retry: false,
          code: null,
          expires_at: '2099-01-01T00:00:00Z'
        }
      }
      return { status: 200, headers: { 'Cache-Control': 'private, no-store' }, data: data as T }
    }
  }
  const client = createHttpClient({
    baseUrl: 'https://api.example.test',
    clientVersion: '1.5',
    session: {
      clear: vi.fn(),
      getAccessToken: () => 'fixture-token',
      refresh: async () => undefined
    },
    transport
  })
  return { service: createPronunciationService(client), requests }
}

describe('统一HTTP层发音契约流程', () => {
  it('本人收藏准备到READY，查询重传固定目标和资源版本，保留认证与幂等键', async () => {
    vi.useFakeTimers()
    const fixture = createFixture()
    const result = resolvePronunciation(
      { target_id: 'controlled-target', resource_version: 'v2', can_prepare: true },
      { favorite_id: 'owned' },
      fixture.service,
      createAudioCancellation().signal
    )
    await vi.runAllTimersAsync()
    expect(await result).toMatchObject({ status: 'READY', resource_version: 'v2' })
    expect(fixture.requests).toHaveLength(2)
    expect(fixture.requests[0].headers.Authorization).toBe('Bearer fixture-token')
    expect(fixture.requests[0].headers['Idempotency-Key']).toBeTruthy()
  })
  it('传输只提交受控引用，即使调用方额外带文本也不上传文本和供应商配置', async () => {
    const fixture = createFixture()
    await fixture.service.resolve({ target_id: 'controlled-target', resource_version: 'v2' }, {
      favorite_id: 'owned',
      text: 'arbitrary',
      voice: 'arbitrary',
      user_id: 'another-user'
    } as never)
    expect(fixture.requests[0].body).toEqual({ favorite_id: 'owned', resource_version: 'v2' })
  })
})
