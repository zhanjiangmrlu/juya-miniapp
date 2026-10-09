import { AccessLevel } from '@/shared/enums/entitlements'

import type { LearningCatalogResponse } from '@/shared/contracts/learning'

export const SCENE_ACCESS_LABELS: Record<AccessLevel, string> = {
  [AccessLevel.OPEN]: '开放学习场景',
  [AccessLevel.FORMAL]: '正式内容包',
  [AccessLevel.LIMITED]: '限时学习权益',
  [AccessLevel.PREVIEW]: '只读预览',
  [AccessLevel.HIDDEN]: '只读预览'
}

export const EMPTY_LEARNING_CATALOG: LearningCatalogResponse = {
  authorization_pending: false,
  items: []
}

export const DEFAULT_LEARNING_HEADER_RESERVE = 78
