import type { HomeResponse } from '@/shared/contracts/home'
import type { HomeService } from '@/shared/types/home'
import type { HttpClient } from '@/shared/types/http'

export type { HomeService } from '@/shared/types/home'

/** 创建首页聚合服务，页面只消费一次服务端整理后的首页快照。 */
export function createHomeService(client: HttpClient): HomeService {
  return {
    getHome: () => client.get<HomeResponse>('/api/v1/home')
  }
}
