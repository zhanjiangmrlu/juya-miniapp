import type {
  LearningCatalogResponse,
  LearningModule,
  SceneSummary
} from '@/shared/contracts/learning'

export interface SceneCardViewModel {
  accessLabel: string
  canOpen: boolean
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

/** 判断场景是否已开始学习，进度与服务端状态任一成立即可。 */
function hasStarted(scene: SceneSummary): boolean {
  return (scene.progress ?? 0) > 0 || scene.status === 'IN_PROGRESS'
}

/** 将服务端摘要收敛为场景卡模型，并对预览内容移除正文入口。 */
function presentScene(scene: SceneSummary): SceneCardViewModel {
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
    chineseTitle: scene.chinese_title,
    description: scene.description ?? '可查看主题、难度与简介',
    entryUrl: canOpen ? `/pages/scene/detail?sceneId=${encodeURIComponent(scene.scene_id)}` : null,
    imageUrl: scene.image_url,
    progress: Math.max(0, Math.min(100, scene.progress ?? 0)),
    sceneId: scene.scene_id,
    series: scene.series,
    title: scene.title
  }
}

/**
 * 按服务端顺序生成目录分区，仅做访问级别映射和去重，不在客户端扩大任何权益。
 */
export function presentCatalog(input: CatalogPresentationInput): CatalogSections {
  const modules = input.modules.filter(
    (module) => module.enabled && module.key === 'scene_learning'
  )
  const visible = input.catalog.items.filter((scene) => scene.access !== 'HIDDEN')
  const open = visible.filter((scene) => scene.access === 'OPEN')
  const entitled = visible.filter(
    (scene) => scene.access === 'FORMAL' || scene.access === 'LIMITED'
  )
  const hasEntitlement = entitled.length > 0
  const openSceneIds = new Set(open.map((scene) => scene.scene_id))
  const preview = visible.filter(
    (scene) => scene.access === 'PREVIEW' && !openSceneIds.has(scene.scene_id)
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
          completedCount: open.filter((scene) => (scene.progress ?? 0) >= 100).length,
          totalCount: open.length
        }
      : null,
    openScenes: hasEntitlement ? [] : open.map(presentScene),
    previewScenes: preview.map(presentScene),
    showProfileAction: input.catalog.profile_completion_enabled === true,
    stage: hasEntitlement ? 'ENTITLED' : 'NEW'
  }
}
