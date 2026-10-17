import type { components } from '@/shared/contracts/generated/mini-api'
export type CardBrief = components['schemas']['CardBrief']
export type CardSummary = components['schemas']['PersonalSummary']
export type CardState = components['schemas']['CardState']
export type SceneListItem =
  | CardBrief
  | CardSummary
  | components['schemas']['LearningRecord']
  | components['schemas']['DailyRecord']
export type PublishedScene = components['schemas']['PublishedDetail']
