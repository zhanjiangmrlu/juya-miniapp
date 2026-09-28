import { createAccountService } from '@/features/account/account-service'
import { createContactService } from '@/features/contact-profile/contact-service'
import { createEntitlementService } from '@/features/entitlements/entitlement-service'
import { createFavoriteService } from '@/features/favorites/favorite-service'
import { createFeedbackService } from '@/features/feedback/feedback-service'
import { createHomeService } from '@/features/home/home-service'
import { createCatalogService } from '@/features/learning/catalog-service'
import { createResultService } from '@/features/learning-result/result-service'
import { createMessageService } from '@/features/messages/message-service'
import { createProfileService } from '@/features/profile/profile-service'
import { createSceneService } from '@/features/scene/scene-service'
import { createHttpClient, type HttpClient } from '@/services/http/client'
import { UniTransport } from '@/services/http/uni-transport'
import { MockTransport } from '@/services/mock/mock-transport'
import { useSessionStore } from '@/stores/session'

import type { SessionResponse } from '@/shared/contracts/session'

export interface RuntimeServices {
  account: ReturnType<typeof createAccountService>
  catalog: ReturnType<typeof createCatalogService>
  client: HttpClient
  contact: ReturnType<typeof createContactService>
  home: ReturnType<typeof createHomeService>
  favorites: ReturnType<typeof createFavoriteService>
  entitlements: ReturnType<typeof createEntitlementService>
  feedback: ReturnType<typeof createFeedbackService>
  result: ReturnType<typeof createResultService>
  messages: ReturnType<typeof createMessageService>
  profile: ReturnType<typeof createProfileService>
  scene: ReturnType<typeof createSceneService>
}

let services: RuntimeServices | undefined

/** 创建带会话刷新能力的客户端，开发环境可显式切换到本地契约 mock。 */
function createRuntimeClient(): HttpClient {
  const session = useSessionStore()
  const client = createHttpClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://mock.juya.local',
    clientVersion: import.meta.env.VITE_CLIENT_VERSION || '1.3.0',
    session: {
      clear: session.clear,
      getAccessToken: () => session.accessToken,
      refresh: async () => {
        if (!session.refreshToken) return undefined

        try {
          const tokens = await client.post<SessionResponse>(
            '/api/v1/session/refresh',
            { refresh_token: session.refreshToken },
            { auth: false }
          )
          session.saveTokens(tokens)
          return tokens.access_token
        } catch {
          return undefined
        }
      }
    },
    transport:
      import.meta.env.VITE_USE_MOCK_API === 'true' ? new MockTransport() : new UniTransport()
  })

  return client
}

/** 延迟创建并复用运行时服务，保证所有页面共享请求刷新单飞状态。 */
export function getRuntimeServices(): RuntimeServices {
  if (services) return services

  const client = createRuntimeClient()
  services = {
    account: createAccountService(client),
    catalog: createCatalogService(client),
    client,
    contact: createContactService(client),
    entitlements: createEntitlementService(client),
    feedback: createFeedbackService(client),
    favorites: createFavoriteService(client),
    home: createHomeService(client),
    messages: createMessageService(client),
    result: createResultService(client),
    profile: createProfileService(client),
    scene: createSceneService(client)
  }
  return services
}
