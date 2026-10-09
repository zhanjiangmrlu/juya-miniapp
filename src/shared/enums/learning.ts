/** 学习目录用户阶段 */
export const LearningCatalogStage = {
  ENTITLED: 'ENTITLED',
  NEW: 'NEW'
} as const

export type LearningCatalogStage =
  (typeof LearningCatalogStage)[keyof typeof LearningCatalogStage] & string

/** 场景词汇与语块查询类型 */
export const SceneLookupEntryType = {
  VOCABULARY: 'VOCABULARY',
  PHRASE: 'PHRASE'
} as const

export type SceneLookupEntryType =
  (typeof SceneLookupEntryType)[keyof typeof SceneLookupEntryType] & string

/** 场景内容条目类型 */
export const SceneEntryType = {
  DIALOGUE: 'DIALOGUE',
  VOCABULARY: 'VOCABULARY',
  PHRASE: 'PHRASE'
} as const

export type SceneEntryType = (typeof SceneEntryType)[keyof typeof SceneEntryType] & string

/** 学习目录已识别的场景进度状态 */
export const LearningSceneStatus = {
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS'
} as const

export type LearningSceneStatus = (typeof LearningSceneStatus)[keyof typeof LearningSceneStatus] &
  string
