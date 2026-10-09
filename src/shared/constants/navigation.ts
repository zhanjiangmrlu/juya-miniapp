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

export const APP_TABS = [
  { key: 'home', label: '首页', route: ROUTES.home },
  { key: 'learning', label: '学习', route: ROUTES.learning },
  { key: 'favorites', label: '收藏', route: ROUTES.favorites },
  { key: 'profile', label: '我的', route: ROUTES.profile }
] as const
