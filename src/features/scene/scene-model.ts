import { AccessLevel } from '@/shared/enums/entitlements'
import { SceneModelKind } from '@/shared/enums/scene'

import type { SceneOpenResponse } from '@/shared/contracts/learning'
import type { SceneModel, SceneSummaryModel, SceneViewState } from '@/shared/types/scene'

export type { FullSceneModel } from '@/shared/types/scene'
export type { PreviewSceneModel } from '@/shared/types/scene'
export type { DeniedSceneModel } from '@/shared/types/scene'
export type { SceneModel } from '@/shared/types/scene'
export type { SceneViewState } from '@/shared/types/scene'

/** 提取安全摘要字段，response 为已授权场景打开响应 */
const summarize = (response: SceneOpenResponse): SceneSummaryModel | null => {
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
 * 转换互斥模型，response 为场景打开响应，预览模型不携带正文
 */
export const createSceneModel = (response: SceneOpenResponse): SceneModel => {
  const summary = summarize(response)
  if (!summary || !response.access || response.access === AccessLevel.HIDDEN) {
    return { authorizationPending: response.authorization_pending, kind: SceneModelKind.DENIED }
  }

  if (response.access === AccessLevel.PREVIEW) {
    return {
      ...summary,
      description: response.scene?.description ?? '可查看主题、难度与简介',
      kind: SceneModelKind.PREVIEW
    }
  }

  return {
    ...summary,
    entries: response.scene?.entries ?? [],
    kind: SceneModelKind.FULL,
    audio: response.scene?.audio,
    revision_id: response.scene?.revision_id,
    content_version: response.scene?.content_version,
    original_image_asset_id: response.scene?.original_image_asset_id,
    cover_asset_id: response.scene?.cover_asset_id,
    description: response.scene?.description ?? ''
  }
}

/** 创建页面瞬时状态，_previous 为旧状态，重新进入时仍默认隐藏中文 */
export const createSceneViewState = (_previous?: Partial<SceneViewState>): SceneViewState => {
  return { chineseVisible: false }
}
