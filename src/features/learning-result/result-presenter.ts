import { LearningResultLabel } from '@/shared/enums/learning-result'

import type { LearningResultDto, LearningResultViewModel } from '@/shared/types/learning-result'

export type { LearningResultDto } from '@/shared/types/learning-result'
export type { LearningResultCard } from '@/shared/types/learning-result'
export type { LearningResultViewModel } from '@/shared/types/learning-result'

/** 将学习结果转换为三张始终可点击的成果卡，无数据时使用 0 而非隐藏入口。 */
export function presentLearningResult(dto: LearningResultDto | null): LearningResultViewModel {
  return {
    cards: [
      {
        label: LearningResultLabel.COMPLETED_SCENES,
        route: '/sub-packages/favorites/history',
        value: dto?.completed_scenes ?? 0
      },
      {
        label: LearningResultLabel.FAVORITE_VOCABULARY,
        route: '/pages/favorites/index?tab=vocabulary',
        value: dto?.favorite_vocabulary ?? 0
      },
      {
        label: LearningResultLabel.FAVORITE_PHRASES,
        route: '/pages/favorites/index?tab=phrases',
        value: dto?.favorite_phrases ?? 0
      }
    ],
    streakDays: dto?.streak_days ?? 0
  }
}
