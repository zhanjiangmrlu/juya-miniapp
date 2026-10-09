export interface LearningResultDto {
  completed_scenes: number
  favorite_phrases: number
  favorite_vocabulary: number
  streak_days: number
}

export interface LearningResultCard {
  label: '完成场景' | '收藏词汇' | '收藏语块'
  route: string
  value: number
}

export interface LearningResultViewModel {
  cards: LearningResultCard[]
  streakDays: number
}

/** 将学习结果转换为三张始终可点击的成果卡，无数据时使用 0 而非隐藏入口。 */
export function presentLearningResult(dto: LearningResultDto | null): LearningResultViewModel {
  return {
    cards: [
      {
        label: '完成场景',
        route: '/sub-packages/favorites/history',
        value: dto?.completed_scenes ?? 0
      },
      {
        label: '收藏词汇',
        route: '/sub-packages/favorites/index?tab=vocabulary',
        value: dto?.favorite_vocabulary ?? 0
      },
      {
        label: '收藏语块',
        route: '/sub-packages/favorites/index?tab=phrases',
        value: dto?.favorite_phrases ?? 0
      }
    ],
    streakDays: dto?.streak_days ?? 0
  }
}
