import type { RecordingPlaybackEventType, RecordingStatus } from '@/shared/enums/recording'

export interface RecordingPort {
  deleteFile(path: string): Promise<void>
  playback(path: string): Promise<void>
  requestPermission(): Promise<boolean>
  start(sentenceId: string): Promise<void>
  stop(): Promise<string>
  stopPlayback(): void
  pausePlayback?(): void
  subscribePlayback?(listener: (type: RecordingPlaybackEventType) => void): () => void
  subscribeRecording?(listener: (path?: string) => void): () => void
  destroy?(): void
}

export interface RecordingSnapshot {
  processing?: boolean
  disabledByConfiguration?: boolean
  hasRecording?: boolean
  recordingDisabled: boolean
  selectedSentenceId: string | null
  status: RecordingStatus
}

export interface NativeRecordingCallbacks {
  started(): void
  stopped(path: string): void
  failed(error: unknown): void
}
