import type { AudioTarget, ClickableSpan, SceneEntry } from '@/shared/contracts/learning'
import type { AudioStatus } from '@/shared/enums/audio'
import type { SceneLookupEntryType } from '@/shared/enums/learning'

/** DialogueList 输入属性 */
export type DialogueListProps = {
  chineseVisible: boolean
  currentAudioKey?: string | null
  entries: SceneEntry[]
  status: AudioStatus
  catalog?: SceneEntry[]
  highlightedId?: string
  hideAudio?: boolean
  audioSelectionVisible?: boolean
}

/** DialogueList 事件契约 */
export type DialogueListEmits = {
  inspect: [entry: SceneEntry, span: ClickableSpan]
  play: [target: AudioTarget]
}

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

/** EntryList 输入属性 */
export type EntryListProps = {
  currentAudioKey?: string | null
  entries: SceneEntry[]
  status: AudioStatus
  sentences?: SceneEntry[]
}

/** EntryList 事件契约 */
export type EntryListEmits = { inspect: [entry: SceneEntry]; play: [target: AudioTarget] }

/** EntryPageView 输入属性 */
export type EntryPageViewProps = { entryType: SceneLookupEntryType; title: string }

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

/** SceneStatusPage 输入属性 */
export type SceneStatusPageProps = {
  actionLabel: string
  description: string
  iconLabel: string
  title: string
}

/** SceneStatusPage 事件契约 */
export type SceneStatusPageEmits = {
  action: []
}
