import type { HttpClient } from '@/services/http/client'
import type { LearningCatalogResponse, LearningModulesResponse } from '@/shared/contracts/learning'

export interface CatalogService {
  getCatalog(): Promise<LearningCatalogResponse>
  getModules(): Promise<LearningModulesResponse>
}

/** 创建学习目录服务，将模块入口与个性化目录请求集中在领域层。 */
export function createCatalogService(client: HttpClient): CatalogService {
  return {
    getCatalog: () => client.get<LearningCatalogResponse>('/api/v1/learning/catalog'),
    getModules: () =>
      client.get<LearningModulesResponse>('/api/v1/learning/modules', { auth: false })
  }
}
