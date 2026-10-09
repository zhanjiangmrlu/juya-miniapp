import type { LearningCatalogResponse } from '@/shared/contracts/learning'

export const EMPTY_LEARNING_CATALOG: LearningCatalogResponse = {
  authorization_pending: false,
  items: []
}

export const DEFAULT_LEARNING_HEADER_RESERVE = 78
