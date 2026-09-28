export const ROUTES = {
  compat: '/pages/compat/index',
  explore: '/pages/learning/explore',
  favorites: '/pages/favorites/index',
  home: '/pages/home/index',
  homeFirstVisit: '/pages/home/first-visit',
  homeTodayTask: '/pages/home/today-task',
  learning: '/pages/learning/index',
  learningNoAccess: '/pages/learning/no-access',
  profile: '/pages/profile/index',
  sceneDialogue: '/pages/scene/dialogue'
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export interface NavigationIntent {
  type: 'navigateTo' | 'reLaunch' | 'redirectTo'
  url: string
}
