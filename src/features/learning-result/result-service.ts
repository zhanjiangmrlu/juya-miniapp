import type { LearningResultDto } from '@/features/learning-result/result-presenter'
import type { HttpClient } from '@/services/http/client'

export interface ResultService {
  get(sceneId: string): Promise<LearningResultDto | null>
}

/** 创建学习成果服务，结果只读且以服务端汇总为准。 */
export function createResultService(client: HttpClient): ResultService {
  return {
    get: (sceneId) => client.get(`/api/v1/scenes/${encodeURIComponent(sceneId)}/result`)
  }
}
