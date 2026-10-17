import type { components } from '@/shared/contracts/generated/mini-api'
import type { RecordsTab } from '@/shared/enums/learning'
export interface LearningStatisticsProps {
  statistics: components['schemas']['Statistics']
  onSelect?: (tab: RecordsTab) => void
}
