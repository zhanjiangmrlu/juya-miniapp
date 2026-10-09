import type { FeedbackItem, FeedbackResolutionRequest } from '@/shared/contracts/feedback'
import type { FeedbackScreenshotDraft } from '@/shared/types/feedback'

/** FeedbackCard 输入属性 */
export type FeedbackCardProps = { item: FeedbackItem }

/** FeedbackCard 事件契约 */
export type FeedbackCardEmits = { open: [item: FeedbackItem] }

/** FeedbackDetailView 输入属性 */
export type FeedbackDetailViewProps = { resultMode?: boolean }

/** FeedbackForm 输入属性 */
export type FeedbackFormProps = { blocked?: boolean }

/** FeedbackImagePicker 输入属性 */
export type FeedbackImagePickerProps = { image?: FeedbackScreenshotDraft }

/** FeedbackImagePicker 事件契约 */
export type FeedbackImagePickerEmits = { select: [file: FeedbackScreenshotDraft | undefined] }

/** FeedbackResolutionActions 输入属性 */
export type FeedbackResolutionActionsProps = { item: FeedbackItem; loading?: boolean }

/** FeedbackResolutionActions 事件契约 */
export type FeedbackResolutionActionsEmits = { resolve: [payload: FeedbackResolutionRequest] }

/** FeedbackStatus 输入属性 */
export type FeedbackStatusProps = { status: string }

/** FeedbackTimeline 输入属性 */
export type FeedbackTimelineProps = { item: FeedbackItem }
