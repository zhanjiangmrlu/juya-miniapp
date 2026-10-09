import { AudioStatus } from '@/shared/enums/audio'

/** 可保留当前音频目标并继续播放的状态 */
export const AUDIO_PLAYBACK_STATUSES: readonly AudioStatus[] = [
  AudioStatus.PLAYING,
  AudioStatus.PAUSED
]
