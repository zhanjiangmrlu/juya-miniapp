import type { createAccountService } from '@/features/account/account-service'
import type { createContactService } from '@/features/contact-profile/contact-service'
import type { createEntitlementService } from '@/features/entitlements/entitlement-service'
import type { createFavoriteService } from '@/features/favorites/favorite-service'
import type { createFeedbackService } from '@/features/feedback/feedback-service'
import type { createHomeService } from '@/features/home/home-service'
import type { createCatalogService } from '@/features/learning/catalog-service'
import type { createResultService } from '@/features/learning-result/result-service'
import type { createMessageService } from '@/features/messages/message-service'
import type { createProfileService } from '@/features/profile/profile-service'
import type { createSceneService } from '@/features/scene/scene-service'
import type { HttpClient } from '@/shared/types/http'

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
