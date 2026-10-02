import { adaptSceneResponse } from '@/services/scene-response'

import type { HttpClient } from '@/services/http/client'
import type {
  AudioTarget,
  LearningProgress,
  PublishedEntry,
  SceneEntryQuery,
  SceneOpenResponse,
  SceneOpenWireResponse,
  SignedMediaResponse,
  SignedResourceResponse
} from '@/shared/contracts/learning'

export interface SceneService {
  complete(sceneId: string, idempotencyKey?: string): Promise<{ progress: LearningProgress }>
  getSignedUrl(target: AudioTarget): Promise<SignedMediaResponse>
  open(sceneId: string): Promise<SceneOpenResponse>
  getEntry(
    sceneId: string,
    entryId: string,
    query: SceneEntryQuery
  ): Promise<
    PublishedEntry & {
      sentence_snapshot: string
      source_locator: string
      scene_id: string
      revision_id: string
      entry_type?: string
      favorited?: boolean
    }
  >
  getResource(
    sceneId: string,
    resourceId: string,
    revisionId: string
  ): Promise<SignedResourceResponse>
  savePosition(
    sceneId: string,
    position: { client_sequence: number; entry_id: string; offset: number },
    idempotencyKey?: string
  ): Promise<LearningProgress>
}

/** 创建场景领域服务，client 为统一身份、签名与幂等请求端口 */
export const createSceneService = (client: HttpClient): SceneService => {
  return {
    complete: (sceneId, idempotencyKey) =>
      client.post(`/api/v1/scenes/${encodeURIComponent(sceneId)}/complete`, undefined, {
        idempotencyKey
      }),
    getSignedUrl: async (target) => {
      if (target.scene_id && target.revision_id) {
        const result = await client.get<SignedResourceResponse>(
          `/api/v1/scenes/${encodeURIComponent(target.scene_id)}/resources/${encodeURIComponent(target.resource_id ?? target.target_id)}/signed-url?revision_id=${encodeURIComponent(target.revision_id)}`
        )
        return { ...result, target_id: target.target_id }
      }
      return client.post(`/api/v1/media/${encodeURIComponent(target.target_id)}/signed-url`)
    },
    open: async (sceneId) =>
      adaptSceneResponse(
        await client.post<SceneOpenWireResponse>(
          `/api/v1/scenes/${encodeURIComponent(sceneId)}/open`
        )
      ),
    getEntry: (sceneId, entryId, query) =>
      client.get(
        `/api/v1/scenes/${encodeURIComponent(sceneId)}/entries/${encodeURIComponent(entryId)}?revision_id=${encodeURIComponent(query.revision_id)}&entry_version=${query.entry_version}&source_locator=${encodeURIComponent(query.source_locator)}`
      ),
    getResource: (sceneId, resourceId, revisionId) =>
      client.get(
        `/api/v1/scenes/${encodeURIComponent(sceneId)}/resources/${encodeURIComponent(resourceId)}/signed-url?revision_id=${encodeURIComponent(revisionId)}`
      ),
    savePosition: (sceneId, position, idempotencyKey) =>
      client.put(`/api/v1/scenes/${encodeURIComponent(sceneId)}/progress`, position, {
        idempotencyKey
      })
  }
}
