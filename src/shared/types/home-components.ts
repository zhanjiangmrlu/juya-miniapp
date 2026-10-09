import type { CheckinSummary } from '@/shared/contracts/home'
import type { HomeEntryMode, HomePageMode } from '@/shared/enums/home'
import type { HomeViewModel, TodayTaskViewModel } from '@/shared/types/home'
import type { SceneCardViewModel } from '@/shared/types/learning'

/** HomeDashboard 输入属性 */
export type HomeDashboardProps = {
  canStartTask?: boolean
  openSceneCount: number | null
  taskScene?: SceneCardViewModel
  view: HomeViewModel
}

/** HomeDashboard 事件契约 */
export type HomeDashboardEmits = { startTask: []; openReview: [] }

/** HomeEntryPage 输入属性 */
export type HomeEntryPageProps = { mode: HomeEntryMode; embedded?: boolean }

/** HomeNavigation 输入属性 */
export type HomeNavigationProps = { unreadMessageCount: number | null }

/** HomeNavigation 事件契约 */
export type HomeNavigationEmits = { openMessages: [] }

/** HomePageView 输入属性 */
export type HomePageViewProps = {
  mode?: HomePageMode
  networkError?: boolean
}

/** HomeReviewCard 事件契约 */
export type HomeReviewCardEmits = { review: [] }

/** OpenSceneSummary 输入属性 */
export type OpenSceneSummaryProps = { count: number | null }

/** StreakCard 输入属性 */
export type StreakCardProps = { checkins: CheckinSummary | null }

/** TodayTaskCard 输入属性 */
export type TodayTaskCardProps = {
  canStart?: boolean
  scene?: SceneCardViewModel
  task: TodayTaskViewModel | null
}

/** TodayTaskCard 事件契约 */
export type TodayTaskCardEmits = { start: [] }
