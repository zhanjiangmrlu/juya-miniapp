export const ROUTES = {
  compat: '/pages/compat/index',
  favorites: '/pages/favorites/index',
  home: '/pages/home/index',
  learning: '/pages/learning/index',
  profile: '/pages/profile/index',
  sceneDialogue: '/pages/scene/dialogue'
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export interface NavigationIntent {
  type: 'navigateTo' | 'reLaunch' | 'redirectTo'
  url: string
}
