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
  onAccessDenied?: () => void
  resolveUrl(target: AudioTarget): Promise<string>
}

export interface AudioSnapshot {
  currentTimeMs?: number
  status: AudioStatus
  target: AudioTarget | null
}
