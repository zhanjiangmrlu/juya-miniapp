import type {
  PronunciationContext,
  PronunciationResult,
  PronunciationTarget
} from '@/shared/contracts/audio'
import type { AudioTarget } from '@/shared/contracts/learning'
import type { AudioEventType, AudioStatus } from '@/shared/enums/audio'

export interface AudioEvent {
  type: AudioEventType
  currentTimeMs?: number
  status?: number
}

export interface AudioEngine {
  destroy(): void
  pause(): void
  play(): void
  seek(seconds: number): void
  setSource(url: string): void
  stop(): void
  subscribe(listener: (event: AudioEvent) => void): () => void
}

export interface AudioControllerOptions {
  engine: AudioEngine
  onChange?: (snapshot: AudioSnapshot) => void
  onAccessDenied?: (target: AudioTarget) => void
  resolveUrl: AudioUrlResolver
}

export interface AudioCancellationSignal {
  readonly aborted: boolean
  addEventListener(event: 'abort', listener: () => void, options?: { once: boolean }): void
  removeEventListener(event: 'abort', listener: () => void): void
}
export interface AudioCancellation {
  signal: AudioCancellationSignal
  abort(): void
}
export type AudioUrlResolver = (
  target: AudioTarget,
  signal: AudioCancellationSignal
) => Promise<string>

export interface PronunciationService {
  resolve(target: PronunciationTarget, context: PronunciationContext): Promise<PronunciationResult>
  task(
    taskId: string,
    context: PronunciationContext,
    target?: PronunciationTarget
  ): Promise<PronunciationResult>
}

export interface AudioSnapshot {
  pronunciationStatus?: import('@/shared/enums/audio').PronunciationStatus
  canRetry?: boolean
  currentTimeMs?: number
  status: AudioStatus
  target: AudioTarget | null
}
