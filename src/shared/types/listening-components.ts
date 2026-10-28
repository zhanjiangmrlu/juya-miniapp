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
