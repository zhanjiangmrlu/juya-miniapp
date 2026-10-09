import type { NavigationType } from '@/shared/enums/navigation'

export const ROUTES = {
  compat: '/sub-packages/compat/index',
  explore: '/sub-packages/learning/explore',
  favorites: '/sub-packages/favorites/index',
  home: '/pages/home/index',
  homeFirstVisit: '/sub-packages/home/first-visit',
  homeTodayTask: '/sub-packages/home/today-task',
  learning: '/sub-packages/learning/index',
  learningNoAccess: '/sub-packages/learning/no-access',
  profile: '/sub-packages/profile/index',
  sceneDialogue: '/sub-packages/scene/dialogue'
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export interface NavigationIntent {
  type: NavigationType
  url: string
}
