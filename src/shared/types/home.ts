import type { HomeResponse } from '@/shared/contracts/home'

export interface TodayTaskViewModel {
  buttonLabel: string
  description: string
  eyebrow: string
  title: string
  url: string
}

export interface HomeViewModel {
  checkins: HomeResponse['checkins'] | null
  dateLabel: string
  isFallback: boolean
  salutation: string
  todayTask: TodayTaskViewModel | null
  unreadMessageCount: number | null
}

export interface HomeService {
  getHome(): Promise<HomeResponse>
}

export type SampleVocabulary = { text: string; sceneTitle: string }
