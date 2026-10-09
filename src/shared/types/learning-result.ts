import type { LearningResultLabel } from '@/shared/enums/learning-result'

export interface LearningResultDto {
  completed_scenes: number
  favorite_phrases: number
  favorite_vocabulary: number
  streak_days: number
}

export interface LearningResultCard {
  label: LearningResultLabel
  route: string
  value: number
}

export interface LearningResultViewModel {
  cards: LearningResultCard[]
  streakDays: number
}

export interface ResultService {
  get(sceneId: string): Promise<LearningResultDto | null>
}
