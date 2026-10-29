import type { ListeningCollectionMode } from '../enums/listening'
import type { ListeningArticle, ListeningSummary } from './listening'
export interface ListeningArticleCardProps {
  timestamp?: import('../enums/listening').ListeningTimestampKind
  article: ListeningSummary
}
export interface ListeningBodyProps {
  article: ListeningArticle
  milliseconds: number
  duration: number
  ended: boolean
}
export interface ListeningCollectionProps {
  mode: ListeningCollectionMode
}
export interface ListeningBodyHandle {
  measureReading: (scrollTop: number) => Promise<import('./learning').ReadingBlock[]>
}
export interface ListeningCompletionProps {
  next: Pick<ListeningSummary, 'title_zh' | 'title_en' | 'word_count'> | null
  ended: boolean
  busy?: boolean
  result?:
    | import('../contracts/generated/mini-api').components['schemas']['ListeningCompletionResult']
    | null
  error?: string
}
export interface ListeningImageViewerProps {
  image: string
  error: string
}
export interface ListeningResumeLocation {
  progress?: { reading_position: number } | null
  reading_paragraph?: number | null
}
