import { createHttpClient } from '@/services/http/client'
import { MockTransport } from '@/services/mock/mock-transport'

/** 创建使用契约 mock 的真实请求客户端，端到端冒烟测试不绕过请求层。 */
export function createE2eClient() {
  let accessToken = 'e2e-access-token'
  return createHttpClient({
    baseUrl: 'http://127.0.0.1:8000',
    clientVersion: '1.3.0-e2e',
    idFactory: (() => {
      let sequence = 0
      return () => `e2e-${++sequence}`
    })(),
    session: {
      clear: () => {
        accessToken = ''
      },
      getAccessToken: () => accessToken,
      refresh: async () => accessToken
    },
    transport: new MockTransport()
  })
}
