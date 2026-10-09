import type { TabKey } from '@/shared/enums/navigation'
import type { ButtonVariant, PageAppearance, PageTier, SurfaceTone } from '@/shared/enums/ui'

/** AppButton 输入属性 */
export type AppButtonProps = {
  block?: boolean
  disabled?: boolean
  label: string
  loading?: boolean
  variant?: ButtonVariant
}

/** AppButton 事件契约 */
export type AppButtonEmits = {
  press: []
}

/** AppImageViewer 输入属性 */
export type AppImageViewerProps = {
  imageUrl: string
  title?: string
  subtitle?: string
  caption?: string
  dialogLabel?: string
  closeLabel?: string
}

/** AppImageViewer 事件契约 */
export type AppImageViewerEmits = { close: []; error: [] }

/** AppPage 输入属性 */
export type AppPageProps = {
  padded?: boolean
  tier?: PageTier
  appearance?: PageAppearance
}

/** AppState 输入属性 */
export type AppStateProps = {
  description: string
  iconLabel?: string
  title: string
}

/** NetworkReconnectDialog 事件契约 */
export type NetworkReconnectDialogEmits = {
  close: []
  retry: []
}

/** PageHeader 输入属性 */
export type PageHeaderProps = {
  backLabel?: string
  centered?: boolean
  eyebrow?: string
  showBack?: boolean
  title: string
}

/** SurfaceCard 输入属性 */
export type SurfaceCardProps = {
  elevated?: boolean
  tone?: SurfaceTone
}

/** TabPageLayout 输入属性 */
export type TabPageLayoutProps = {
  active: TabKey
  tier?: PageTier
  appearance?: PageAppearance
}
