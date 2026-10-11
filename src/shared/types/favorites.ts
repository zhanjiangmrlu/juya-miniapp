import type {
  FavoriteItem,
  FavoriteMutationState,
  FavoritePage,
  FavoriteReference,
  FavoriteSource,
  FavoriteSourceResolution,
  ReviewSession
} from '@/shared/contracts/favorites'
import type { ReviewCardFace } from '@/shared/enums/favorites'

export interface FavoriteSourceViewModel extends FavoriteSource {
  returnUrl: string | null
}

export interface FavoriteGroup {
  id: string
  displayKey: string
  items: FavoriteItem[]
  sources: FavoriteSourceViewModel[]
}

export interface FavoriteService {
  create(reference: FavoriteReference, idempotencyKey?: string): Promise<FavoriteItem>
  completeReview(reviewId: string, idempotencyKey: string): Promise<void>
  createReview(cardIds: string[], idempotencyKey?: string): Promise<ReviewSession>
  get(id: string): Promise<FavoriteItem>
  list(cursor?: string): Promise<FavoritePage>
  remove(id: string, idempotencyKey?: string): Promise<FavoriteMutationState>
  resolveSource(id: string): Promise<FavoriteSourceResolution>
}

export interface FavoriteTargetState {
  is_favorited: boolean
  favorite_id: string | null
  pending: boolean
  error: string
}

export interface HistoryItem {
  source_type?: string
  completed_at: string | null
  last_learned_at: string
  scene_id: string
  scene_title?: string
  progress?: number
  favorite_count?: number
}

export interface HistoryPresentationOptions {
  openOnly?: boolean
  authorizationPending?: boolean
}

export interface HistoryRow {
  title: string
  detail: string
  badge: string
  route: string | null
}

export interface ReviewSnapshot {
  cardIds: string[]
  face: ReviewCardFace
  index: number
}

export interface ReviewSessionController {
  complete(sender: (idempotencyKey: string) => Promise<void>): Promise<void>
  flip(): void
  next(): void
  playAudio(): void
  readonly snapshot: ReviewSnapshot
}

export interface FavoriteTabState {
  cursor: string | null
  filter: string
  scrollTop: number
  review?: {
    cardIds: string[]
    index: number
    face: ReviewCardFace
    session?: ReviewSession
    createKey?: string
    completionKey?: string
  } | null
}

export type FavoriteReviewOptions = { idFactory?: () => string }

export type FavoriteHistoryResponse = {
  items: HistoryItem[]
  has_more: boolean
  next_cursor: string | null
}
