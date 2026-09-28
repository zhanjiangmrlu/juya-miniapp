import type { SceneEntry, SceneOpenResponse } from '@/shared/contracts/learning'

interface SceneSummaryModel {
  chineseTitle: string
  imageUrl?: string
  sceneId: string
  series: string
  title: string
}

export interface FullSceneModel extends SceneSummaryModel {
  entries: SceneEntry[]
  kind: 'FULL'
}

export interface PreviewSceneModel extends SceneSummaryModel {
  description: string
  kind: 'PREVIEW'
}

export interface DeniedSceneModel {
  authorizationPending: boolean
  kind: 'DENIED'
}

export type SceneModel = DeniedSceneModel | FullSceneModel | PreviewSceneModel

export interface SceneViewState {
  chineseVisible: boolean
}

/** 提取完整与预览模型共同使用的安全摘要字段。 */
function summarize(response: SceneOpenResponse): SceneSummaryModel | null {
  if (!response.scene) return null
  return {
    chineseTitle: response.scene.chinese_title,
    imageUrl: response.scene.hero_image_url ?? response.scene.image_url,
    sceneId: response.scene.scene_id,
    series: response.scene.series,
    title: response.scene.title
  }
}

/**
 * 将打开响应转换为互斥模型，预览模型从类型层面禁止携带正文 entries。
 */
export function createSceneModel(response: SceneOpenResponse): SceneModel {
  const summary = summarize(response)
  if (!summary || !response.access || response.access === 'HIDDEN') {
    return { authorizationPending: response.authorization_pending, kind: 'DENIED' }
  }

  if (response.access === 'PREVIEW') {
    return {
      ...summary,
      description: response.scene?.description ?? '可查看主题、难度与简介',
      kind: 'PREVIEW'
    }
  }

  return { ...summary, entries: response.scene?.entries ?? [], kind: 'FULL' }
}

/** 创建场景页面瞬时状态；每次进入都强制恢复默认隐藏中文。 */
export function createSceneViewState(_previous?: Partial<SceneViewState>): SceneViewState {
  return { chineseVisible: false }
}
