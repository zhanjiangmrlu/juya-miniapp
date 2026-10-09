import { createHttpClient } from '@/services/http/client'
import { MockTransport } from '@/services/mock/mock-transport'

/** 创建共享请求层与 MockTransport 的契约流程客户端，不访问真实后端 */
export const createIntegrationClient = () => {
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
