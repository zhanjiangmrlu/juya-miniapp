import type { PLAYBACK_RATES } from '@/shared/constants/audio'
import type { AudioStatus } from '@/shared/enums/audio'
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]
export interface LearningAudioSession {
  rate: PlaybackRate
}
export interface AudioPort {
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
  onEnded: (callback: () => void) => void
  onError: (callback: () => void) => void
  onTimeUpdate: (callback: () => void) => void
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
