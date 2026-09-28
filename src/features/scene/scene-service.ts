import type { HttpClient } from '@/services/http/client'
import type {
  AudioTarget,
  LearningProgress,
  SceneOpenResponse,
  SignedMediaResponse
} from '@/shared/contracts/learning'

export interface SceneService {
  complete(sceneId: string, idempotencyKey?: string): Promise<{ progress: LearningProgress }>
  getSignedUrl(target: AudioTarget): Promise<SignedMediaResponse>
  open(sceneId: string): Promise<SceneOpenResponse>
  savePosition(
    sceneId: string,
    position: { client_sequence: number; entry_id: string; offset: number },
    idempotencyKey?: string
  ): Promise<LearningProgress>
}

/** 创建场景领域服务，统一编码路径标识并保留写请求幂等策略。 */
export function createSceneService(client: HttpClient): SceneService {
  return {
    complete: (sceneId, idempotencyKey) =>
      client.post(`/api/v1/scenes/${encodeURIComponent(sceneId)}/complete`, undefined, {
        idempotencyKey
      }),
    getSignedUrl: (target) =>
      client.post(`/api/v1/media/${encodeURIComponent(target.target_id)}/signed-url`),
    open: (sceneId) => client.post(`/api/v1/scenes/${encodeURIComponent(sceneId)}/open`),
    savePosition: (sceneId, position, idempotencyKey) =>
      client.put(`/api/v1/scenes/${encodeURIComponent(sceneId)}/progress`, position, {
        idempotencyKey
      })
  }
}
