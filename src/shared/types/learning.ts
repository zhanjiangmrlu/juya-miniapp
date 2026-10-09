import type {
  LearningCatalogResponse,
  LearningModule,
  LearningModulesResponse
} from '@/shared/contracts/learning'
import type { LearningCatalogStage } from '@/shared/enums/learning'

export interface SceneCardViewModel {
  accessLabel: string
  canOpen: boolean
  category?: string
  tags?: string[]
  chineseTitle: string
  description: string
  entryUrl: string | null
  imageUrl?: string
  progress: number
  sceneId: string
  series: string
  title: string
}

export interface CatalogSections {
  authorizationPending: boolean
  currentLearning: SceneCardViewModel[]
  entitledScenes: SceneCardViewModel[]
  modules: LearningModule[]
  openReview: { completedCount: number; totalCount: number } | null
  openScenes: SceneCardViewModel[]
  previewScenes: SceneCardViewModel[]
  showProfileAction: boolean
  stage: LearningCatalogStage
}

export interface CatalogPresentationInput {
  catalog: LearningCatalogResponse
  modules: LearningModule[]
}

export interface CatalogService {
  getCatalog(): Promise<LearningCatalogResponse>
  getModules(): Promise<LearningModulesResponse>
}
