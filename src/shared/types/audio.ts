import type { PLAYBACK_RATES } from '@/shared/constants/audio'
import type { AudioStatus } from '@/shared/enums/audio'
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]
export interface AudioFailure {
  errCode?: number | string
  errMsg?: string
}
export interface WordAudioDiagnostic {
  stage: 'resolve' | 'download' | 'format' | 'permission' | 'native'
  outcome: 'ready' | 'error' | 'cancelled'
  elapsed: number
  code?: string
  status?: number
  source?: 'local' | 'remote'
  format?: 'mp3' | 'wav'
}
export interface LearningAudioSession {
  rate: PlaybackRate
}
export interface AudioPort {
  background?: boolean
  paused?: boolean
  prepare?: (src: string) => void
  playbackRate?: number
  src: string
  currentTime: number
  duration: number
  play: () => void
  pause: () => void
  stop: () => void
  seek: (seconds: number) => void
  destroy: () => void
  onPlay: (callback: () => void) => void
  onPause: (callback: () => void) => void
  onStop?: (callback: () => void) => void
  onEnded: (callback: () => void) => void
  onError: (callback: (reason?: AudioFailure) => void) => void
  onTimeUpdate: (callback: () => void) => void
}
export interface FullAudioOptions {
  title: string
  resume: (active: () => boolean) => Promise<void>
  leave: () => void
  keepOnNavigate?: (url: string) => boolean
}
export type BackgroundAudioNative = Pick<
  UniNamespace.BackgroundAudioManager,
  | 'src'
  | 'title'
  | 'startTime'
  | 'currentTime'
  | 'duration'
  | 'paused'
  | 'playbackRate'
  | 'play'
  | 'pause'
  | 'stop'
  | 'seek'
  | 'onPlay'
  | 'onPause'
  | 'onStop'
  | 'onEnded'
  | 'onError'
  | 'onTimeUpdate'
>
export interface AudioPreparationCancellation {
  active: () => boolean
  onCancel: (callback: () => void) => () => void
}
export interface AudioCacheFile {
  src: string
  release: () => void
}
export interface FullAudioPreparationPorts {
  networkOnly?: boolean
  resolve: () => Promise<string>
  download: (url: string, task: AudioPreparationCancellation) => Promise<AudioCacheFile>
  active: () => boolean
  prepared: (src: string) => void
  onFailure: (reason: unknown) => void
}
export interface FullAudioPreparationEntry {
  settled: Promise<void>
  expires: number
  url: string
  file: AudioCacheFile | null
  address: Promise<string>
  streaming: boolean
  failed: boolean
  stopDownload: () => void
  cancelAddress: () => void
  timer: ReturnType<typeof setTimeout>
}
export interface AudioState {
  rate: PlaybackRate
  rateError: string
  status: AudioStatus
  position: number
  duration: number
  error: string
  wordId: string | null
  wordStatus: AudioStatus
  wordError: string
}

export interface BackgroundAudioEvents {
  play: () => void
  pause: () => void
  stop: () => void
  ended: () => void
  time: () => void
  error: (reason?: AudioFailure) => void
  release: () => void
}

export interface AudioNavigationArguments {
  url?: string
  success?: (result: unknown) => void
}
