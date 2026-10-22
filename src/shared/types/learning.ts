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

export type LearningQueue = components['schemas']['QueueCreated']
export type LearningQueuePage = components['schemas']['QueuePage']
export interface LearningQueuePorts {
  request: import('./operations').OperationSession['request']
  userId: () => string | null
}
export interface SceneListPage<T> {
  items: T[]
  total: number
  published_total?: number
}
export interface SceneListPorts {
  path: string
  request: import('./operations').OperationSession['request']
  ensure: () => Promise<boolean>
}
export type ReadingPosition = components['schemas']['ReadingPosition']
export interface ReadingBlock {
  anchor: string
  top: number
  height: number
}
export interface ReadingAnchorRect {
  top?: number
  height?: number
  dataset?: { readingAnchor?: string; readinganchor?: string }
}
export interface ReadingPositionWriterPorts {
  userId: () => string | null
  pending: (action: string) => boolean
  recover: (action: string) => Promise<unknown>
  run: (action: string, path: string, method: string, body: unknown) => Promise<unknown>
}
export interface ReadingAnchorComponent {
  measureReading: (scrollTop: number) => Promise<ReadingBlock[]>
}
export interface ReadingPositionViewPorts {
  scene: import('vue').Ref<PublishedScene | null>
  cardId: () => string
  children: () => (ReadingAnchorComponent | null | undefined)[]
}
