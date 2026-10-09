import type { EntitlementService } from '@/shared/types/entitlements'
import type { HttpClient } from '@/shared/types/http'

export type { EntitlementService } from '@/shared/types/entitlements'

/** 创建本人权益只读服务，客户端不进行本地授予或延期。 */
export function createEntitlementService(client: HttpClient): EntitlementService {
  return { get: () => client.get('/api/v1/me/entitlements') }
}
