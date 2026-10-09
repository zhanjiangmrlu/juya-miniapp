import type { LearningResultCard } from '@/shared/types/learning-result'

/** LearningResultCards 输入属性 */
export type LearningResultCardsProps = { cards: LearningResultCard[] }

/** LearningResultCards 事件契约 */
export type LearningResultCardsEmits = { select: [route: string] }
