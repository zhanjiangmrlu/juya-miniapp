import type { components } from '@/shared/contracts/generated/mini-api'
import type { RecordsTab } from '@/shared/enums/learning'
import type { SceneListItem } from '@/shared/types/learning'
export interface LearningStatisticsProps {
  showUnits?: boolean
  statistics: components['schemas']['Statistics']
  onSelect?: (tab: RecordsTab) => void
}
export interface SceneDialogueProps {
  dialogue: components['schemas']['Dialogue'][]
  vocabulary: components['schemas']['Vocabulary'][]
}
export interface SceneVocabularyProps {
  vocabulary: components['schemas']['Vocabulary'][]
  dialogue: components['schemas']['Dialogue'][]
  state: import('@/shared/types/audio').AudioState
  disabled?: boolean
}

export interface SceneCardProps {
  card: SceneListItem
  history?: boolean
  featured?: boolean
  compact?: boolean
  source?: import('../enums/learning').QueueSource
  day?: string
}

export interface SceneSectionHeadingProps {
  english: string
  chinese: string
  count?: number
}

export interface SceneUnavailableProps {
  summary: components['schemas']['PersonalSummary']
  favoriteBusy: boolean
  message: string
}
export interface SceneListFooterProps {
  busy: boolean
  error: string
  hasMore: boolean
  done: boolean
}
export interface SceneQueueEndProps {
  source: import('../enums/learning').QueueSource | null
}
export interface SceneDictionaryProps {
  selection: import('./dictionary').DictionarySelection
  result: import('./dictionary').DictionaryResult | null
  busy: boolean
  error: string
  voiceStatus: import('../enums/audio').AudioStatus
  voiceError: string
}
