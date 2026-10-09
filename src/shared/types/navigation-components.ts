import type { TabKey } from '@/shared/enums/navigation'
import type { PageAppearance } from '@/shared/enums/ui'

/** AppTabBar 输入属性 */
export type AppTabBarProps = { active: TabKey; appearance?: PageAppearance }
