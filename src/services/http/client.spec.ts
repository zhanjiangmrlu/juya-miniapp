import { describe, expect, it, vi } from 'vitest'

import { createHttpClient } from './client'
import { type HttpTransport, NetworkTransportError, type TransportRequest } from './types'

function createTransport(
  handler: (request: TransportRequest, attempt: number) => Promise<unknown>
): HttpTransport {
  let attempt = 0

  return {
    async request<T>(request: TransportRequest) {
      attempt += 1
      return (await handler(request, attempt)) as {
        data: T
        headers: Record<string, string>
        status: number
      }
    }
  }
}

describe('HTTP client', () => {
  it('附加认证、请求标识、客户端版本和默认超时', async () => {
    const transport = createTransport(async (request) => ({
      data: request,
      headers: {},
      status: 200
    }))
    const client = createHttpClient({
      baseUrl: 'https://api.example.test',
      clientVersion: '1.3.0',
      idFactory: () => '11111111-1111-4111-8111-111111111111',
      session: {
        clear: vi.fn(),
        getAccessToken: () => 'access-token',
        refresh: vi.fn()
      },
      transport
    })

    const request = await client.get<TransportRequest>('/api/v1/home')

    expect(request).toMatchObject({
      headers: {
        Authorization: 'Bearer access-token',
        'X-Client-Version': '1.3.0',
        'X-Request-ID': '11111111-1111-4111-8111-111111111111'
      },
      method: 'GET',
      timeout: 10_000,
      url: 'https://api.example.test/api/v1/home'
    })
  })

  it('写请求自动携带独立幂等键', async () => {
    const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
    const transport = createTransport(async (request) => ({
      data: request,
      headers: {},
      status: 200
    }))
    const client = createHttpClient({
      baseUrl: 'https://api.example.test',
      clientVersion: '1.3.0',
      idFactory: () => ids.shift() ?? '33333333-3333-4333-8333-333333333333',
      session: { clear: vi.fn(), getAccessToken: () => undefined, refresh: vi.fn() },
      transport
    })

    const request = await client.post<TransportRequest>('/api/v1/favorites', { text: 'artifact' })

    expect(request.headers['X-Idempotency-Key']).toBe('22222222-2222-4222-8222-222222222222')
  })

  it('GET 网络失败只重试一次而 POST 默认不重试', async () => {
    const getTransport = createTransport(async (_request, attempt) => {
      if (attempt === 1) throw new NetworkTransportError()
      return { data: 'ok', headers: {}, status: 200 }
    })
    const postTransport = createTransport(async () => {
      throw new NetworkTransportError()
    })
    const base = {
      baseUrl: 'https://api.example.test',
      clientVersion: '1.3.0',
      idFactory: () => '11111111-1111-4111-8111-111111111111',
      session: { clear: vi.fn(), getAccessToken: () => undefined, refresh: vi.fn() }
    }

    await expect(
      createHttpClient({ ...base, transport: getTransport }).get('/health')
    ).resolves.toBe('ok')
    await expect(
      createHttpClient({ ...base, transport: postTransport }).post('/api/v1/feedback', {})
    ).rejects.toBeInstanceOf(NetworkTransportError)
    await expect(
      postTransport.request({ headers: {}, method: 'GET', timeout: 1, url: '/' })
    ).rejects.toBeInstanceOf(NetworkTransportError)
  })

  it('并发 401 只刷新一次并使用新令牌重试', async () => {
    let accessToken = 'expired'
    const refresh = vi.fn(async () => {
      accessToken = 'renewed'
      return accessToken
    })
    const transport = createTransport(async (request) => {
      if (request.headers.Authorization === 'Bearer expired') {
        return { data: { code: 'UNAUTHORIZED' }, headers: {}, status: 401 }
      }

      return { data: request.headers.Authorization, headers: {}, status: 200 }
    })
    const client = createHttpClient({
      baseUrl: 'https://api.example.test',
      clientVersion: '1.3.0',
      idFactory: () => crypto.randomUUID(),
      session: { clear: vi.fn(), getAccessToken: () => accessToken, refresh },
      transport
    })

    const results = await Promise.all([client.get('/a'), client.get('/b')])

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results).toEqual(['Bearer renewed', 'Bearer renewed'])
  })

  it('刷新失败会清理会话并拒绝原请求', async () => {
    const clear = vi.fn()
    const client = createHttpClient({
      baseUrl: 'https://api.example.test',
      clientVersion: '1.3.0',
      idFactory: () => '11111111-1111-4111-8111-111111111111',
      session: { clear, getAccessToken: () => 'expired', refresh: vi.fn(async () => undefined) },
      transport: createTransport(async () => ({ data: null, headers: {}, status: 401 }))
    })

    await expect(client.get('/private')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' })
    expect(clear).toHaveBeenCalledOnce()
  })
})
