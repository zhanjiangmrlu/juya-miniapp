import type { AudioTarget, ClickableSpan, SceneEntry } from '@/shared/contracts/learning'
import type { AudioStatus } from '@/shared/enums/audio'

/** DialogueSentence 输入属性 */
export type DialogueSentenceProps = {
  chineseVisible: boolean
  currentAudioKey?: string | null
  entry: SceneEntry
  status: AudioStatus
  catalog?: SceneEntry[]
  highlighted?: boolean
  number?: number
  selected?: boolean
  hideAudio?: boolean
  audioSelectionVisible?: boolean
  inspectEnabled?: boolean
}

/** DialogueSentence 事件契约 */
export type DialogueSentenceEmits = {
  inspect: [entry: SceneEntry, span: ClickableSpan]
  play: [target: AudioTarget]
  select: [entry: SceneEntry]
}

/** PositionPageView 输入属性 */
export type PositionPageViewProps = { source?: boolean }

/** SceneHeading 输入属性 */
export type SceneHeadingProps = {
  chineseTitle: string
  title: string
  series?: string
  spacious?: boolean
}

/** SceneHero 输入属性 */
export type SceneHeroProps = {
  chineseTitle: string
  imageUrl?: string
  series: string
  title: string
  description?: string
}

/** SceneHero 事件契约 */
export type SceneHeroEmits = { viewImage: []; imageError: [] }

/** ScenePageLayout 输入属性 */
export type ScenePageLayoutProps = { title: string; centered?: boolean }

/** 场景统一阅读主体及当前本篇词卡 */
export type SceneReadingViewProps = {
  entries: SceneEntry[]
  words: SceneEntry[]
  chunks: SceneEntry[]
  chineseVisible: boolean
  contentVersion?: number
  highlightedId?: string
  pendingIds?: string[]
}
export type SceneReadingViewEmits = {
  toggleTranslation: []
  favorite: [entry: SceneEntry]
  playSentence: [entry: SceneEntry]
}
export type SceneWordCardProps = {
  entry: SceneEntry
  contentVersion?: number
  pending?: boolean
  chunk?: boolean
}
export type SceneWordCardEmits = { favorite: [entry: SceneEntry] }
export type SceneEntryGridProps = {
  entries: SceneEntry[]
  contentVersion?: number
  pendingIds?: string[]
}
export type SceneEntryGridEmits = { favorite: [entry: SceneEntry] }
