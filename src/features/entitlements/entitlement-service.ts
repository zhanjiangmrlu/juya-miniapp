import type { HttpClient } from '@/services/http/client'
import type { EntitlementsResponse } from '@/shared/contracts/entitlements'

export interface EntitlementService {
  get(): Promise<EntitlementsResponse>
}

/** 创建本人权益只读服务，客户端不进行本地授予或延期。 */
export function createEntitlementService(client: HttpClient): EntitlementService {
  return { get: () => client.get('/api/v1/me/entitlements') }
}
