import type { HttpClient } from '@/services/http/client'
import type { HomeResponse } from '@/shared/contracts/home'

export interface HomeService {
  getHome(): Promise<HomeResponse>
}

/** 创建首页聚合服务，页面只消费一次服务端整理后的首页快照。 */
export function createHomeService(client: HttpClient): HomeService {
  return {
    getHome: () => client.get<HomeResponse>('/api/v1/home')
  }
}
