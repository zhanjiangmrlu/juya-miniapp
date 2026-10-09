import type { TabKey } from '@/shared/enums/navigation'
import type { SceneCardViewModel } from '@/shared/types/learning'

/** AccessNotice 输入属性 */
export type AccessNoticeProps = { showProfileAction?: boolean }

/** AccessNotice 事件契约 */
export type AccessNoticeEmits = { close: []; profile: [] }

/** EntryPageShell 输入属性 */
export type EntryPageShellProps = { active: TabKey }

/** EntrySummary 输入属性 */
export type EntrySummaryProps = {
  label: string
  value: string
  description: string
  sentence?: boolean
}

/** ExplorePageView 输入属性 */
export type ExplorePageViewProps = { initialNotice?: boolean }

/** LearningPageHeading 输入属性 */
export type LearningPageHeadingProps = { eyebrow: string; title: string; large?: boolean }

/** SceneCard 输入属性 */
export type SceneCardProps = { compact?: boolean; scene: SceneCardViewModel; actionLabel?: string }

/** SceneCard 事件契约 */
export type SceneCardEmits = { select: [scene: SceneCardViewModel] }

/** SceneListSection 输入属性 */
export type SceneListSectionProps = {
  actionLabel?: string
  scenes: SceneCardViewModel[]
  title: string
  compact?: boolean
  cardAction?: string
}

/** SceneListSection 事件契约 */
export type SceneListSectionEmits = { action: []; select: [scene: SceneCardViewModel] }

/** Explore 输入属性 */
export type ExploreProps = { initialNotice?: boolean }
