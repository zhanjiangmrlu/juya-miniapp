import type { HttpClient } from '@/shared/types/http'
import type { ResultService } from '@/shared/types/learning-result'

export type { ResultService } from '@/shared/types/learning-result'

/** 创建学习成果服务，结果只读且以服务端汇总为准。 */
export function createResultService(client: HttpClient): ResultService {
  return {
    get: (sceneId) => client.get(`/api/v1/scenes/${encodeURIComponent(sceneId)}/result`)
  }
}
