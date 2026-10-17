import type { components } from '@/shared/contracts/generated/mini-api'
import type { RecordsTab } from '@/shared/enums/learning'
export interface LearningStatisticsProps {
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
