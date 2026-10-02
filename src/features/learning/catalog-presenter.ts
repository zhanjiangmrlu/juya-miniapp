import type {
  LearningCatalogResponse,
  LearningModule,
  SceneSummary
} from '@/shared/contracts/learning'

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
  stage: 'ENTITLED' | 'NEW'
}

export interface CatalogPresentationInput {
  catalog: LearningCatalogResponse
  modules: LearningModule[]
}

/** 判断完成记录，scene 为后台场景摘要，完成状态不依赖可选百分比 */
const hasCompleted = (scene: SceneSummary): boolean =>
  scene.status === 'COMPLETED' || (scene.progress ?? 0) >= 100

/** 判断未完成的学习进度，scene 为后台场景摘要 */
const hasStarted = (scene: SceneSummary): boolean =>
  ((scene.progress ?? 0) > 0 || scene.status === 'IN_PROGRESS') && !hasCompleted(scene)

/** 将摘要映射为卡片，scene 为后台提供的安全展示信息 */
const presentScene = (scene: SceneSummary): SceneCardViewModel => {
  const canOpen = scene.access === 'OPEN' || scene.access === 'FORMAL' || scene.access === 'LIMITED'
  const accessLabel =
    scene.access === 'OPEN'
      ? '开放学习场景'
      : scene.access === 'FORMAL'
        ? '正式内容包'
        : scene.access === 'LIMITED'
          ? '限时学习权益'
          : '只读预览'

  return {
    accessLabel,
    canOpen,
    category: scene.category,
    tags: scene.tags,
    chineseTitle: scene.chinese_title,
    description: scene.description ?? '可查看主题、难度与简介',
    entryUrl: canOpen ? `/pages/scene/detail?sceneId=${encodeURIComponent(scene.scene_id)}` : null,
    imageUrl: scene.image_url,
    progress: hasCompleted(scene) ? 100 : Math.max(0, Math.min(100, scene.progress ?? 0)),
    sceneId: scene.scene_id,
    series: scene.series,
    title: scene.title
  }
}

/** 按后台顺序生成分区，input 包含启用模块及当前账号目录 */
export const presentCatalog = (input: CatalogPresentationInput): CatalogSections => {
  const modules = input.modules.filter(
    (module) => module.enabled && module.key === 'scene_learning'
  )
  const visible = input.catalog.items.filter((scene) => scene.access !== 'HIDDEN')
  const open = visible.filter((scene) => scene.access === 'OPEN')
  const entitled = visible.filter(
    (scene) => scene.access === 'FORMAL' || scene.access === 'LIMITED'
  )
  const hasEntitlement =
    entitled.length > 0 ||
    visible.some(
      (scene) =>
        scene.access !== 'OPEN' &&
        ((scene.progress ?? 0) > 0 || scene.status === 'IN_PROGRESS' || hasCompleted(scene))
    )
  const accessibleIds = new Set([...open, ...entitled].map((scene) => scene.scene_id))
  const preview = visible.filter(
    (scene) => scene.access === 'PREVIEW' && !accessibleIds.has(scene.scene_id)
  )

  return {
    authorizationPending: input.catalog.authorization_pending,
    currentLearning: hasEntitlement
      ? entitled.filter(hasStarted).map(presentScene)
      : open.filter(hasStarted).map(presentScene),
    entitledScenes: hasEntitlement
      ? entitled.filter((scene) => !hasStarted(scene)).map(presentScene)
      : [],
    modules,
    openReview: hasEntitlement
      ? {
          completedCount: open.filter(hasCompleted).length,
          totalCount: open.length
        }
      : null,
    openScenes: hasEntitlement ? [] : open.map(presentScene),
    previewScenes: preview.map(presentScene),
    showProfileAction: input.catalog.profile_completion_enabled === true,
    stage: hasEntitlement ? 'ENTITLED' : 'NEW'
  }
}
