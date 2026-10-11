import type { AudioTarget, SignedMediaResponse } from '@/shared/contracts/learning'
import type {
  ShortReadingCompletionResponse,
  ShortReadingDetail,
  ShortReadingHistoryPage,
  ShortReadingListResponse,
  ShortReadingPositionRequest,
  ShortReadingProgress,
  ShortReadingSummary
} from '@/shared/contracts/short-reading'

export interface ShortReadingService {
  history(cursor?: string): Promise<ShortReadingHistoryPage>
  list(cursor?: string): Promise<ShortReadingListResponse>
  preview(contentId: string): Promise<ShortReadingSummary>
  open(contentId: string): Promise<ShortReadingDetail>
  savePosition(
    contentId: string,
    position: ShortReadingPositionRequest,
    idempotencyKey?: string
  ): Promise<ShortReadingProgress>
  complete(
    contentId: string,
    contentVersion: number,
    idempotencyKey?: string
  ): Promise<ShortReadingCompletionResponse>
  getSignedUrl(target: AudioTarget): Promise<SignedMediaResponse>
}

export interface ShortReadingProgressCommand {
  contentId: string
  contentVersion: number
  idempotencyKey: string
  position: ShortReadingPositionRequest
}

export interface ShortReadingQueueOptions {
  save(command: ShortReadingProgressCommand): Promise<unknown>
  denied(error: unknown): boolean
  onDenied(): void
  idFactory?: () => string
  delay?: number
}

export interface ShortReadingControllerOptions {
  service: ShortReadingService
  audio: {
    dispose(): void
    play(target: AudioTarget, service: Pick<ShortReadingService, 'getSignedUrl'>): Promise<void>
  }
}

export interface ShortReadingEntryOptions {
  /** 参数存在表示来源跳转，即使版本非法也不能恢复旧阅读位置 */
  contentVersion?: number
  sourceLocator?: string
}
