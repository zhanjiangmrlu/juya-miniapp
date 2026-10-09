import { TabKey } from '@/shared/enums/navigation'
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
  { key: TabKey.HOME, label: '首页', route: ROUTES.home },
  { key: TabKey.LEARNING, label: '学习', route: ROUTES.learning },
  { key: TabKey.FAVORITES, label: '收藏', route: ROUTES.favorites },
  { key: TabKey.PROFILE, label: '我的', route: ROUTES.profile }
] as const
