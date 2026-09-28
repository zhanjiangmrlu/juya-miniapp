import type { HttpTransport, TransportRequest, TransportResponse } from '../http/types'

import { MOCK_FIXTURES } from './fixtures'
const ROUTES: Record<string, unknown> = {
  'GET /api/v1/home': MOCK_FIXTURES.home,
  'GET /api/v1/learning/catalog': MOCK_FIXTURES.catalog,
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
  async request<T>(request: TransportRequest): Promise<TransportResponse<T>> {
    const url = new URL(request.url)
    const fixture = ROUTES[`${request.method} ${url.pathname}`]
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
