import type {
  AudioTarget,
  ClickableSpan,
  LearningProgress,
  PublishedEntry,
  SceneEntry,
  SceneEntryQuery,
  SceneOpenResponse,
  SignedMediaResponse,
  SignedResourceResponse
} from '@/shared/contracts/learning'
import type { SceneModelKind } from '@/shared/enums/scene'

export interface ClickableSegment {
  text: string
  span?: ClickableSpan
}

export interface SceneSummaryModel {
  chineseTitle: string
  imageUrl?: string
  sceneId: string
  series: string
  title: string
}

export interface FullSceneModel extends SceneSummaryModel {
  audio?: AudioTarget
  revision_id?: string
  content_version?: number
  original_image_asset_id?: string | null
  cover_asset_id?: string | null
  description: string
  entries: SceneEntry[]
  kind: typeof SceneModelKind.FULL
}

export interface PreviewSceneModel extends SceneSummaryModel {
  description: string
  kind: typeof SceneModelKind.PREVIEW
}

export interface DeniedSceneModel {
  authorizationPending: boolean
  kind: typeof SceneModelKind.DENIED
}

export type SceneModel = DeniedSceneModel | FullSceneModel | PreviewSceneModel

export interface SceneViewState {
  chineseVisible: boolean
}

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

export type ScenePageOptions = { resume?: boolean }
