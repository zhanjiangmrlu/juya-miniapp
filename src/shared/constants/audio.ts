import pauseGreen from '@/features/audio/assets/pause-green.svg'
import pauseLarge from '@/features/audio/assets/pause-large.svg'
import pauseWhite from '@/features/audio/assets/pause-white.svg'
import playGreen from '@/features/audio/assets/play-green.svg'
import playLarge from '@/features/audio/assets/play-large.svg'
import playWhite from '@/features/audio/assets/play-white.svg'
import { AudioButtonVariant, AudioStatus } from '@/shared/enums/audio'

/** 单次点击的准备轮询边界，不取消后台共享任务 */
export const PRONUNCIATION_POLL_TIMEOUT_MS = 30_000
export const PRONUNCIATION_POLL_INITIAL_MS = 500
export const PRONUNCIATION_POLL_MAX_MS = 3_000

/** 可保留当前音频目标并继续播放的状态 */
export const AUDIO_PLAYBACK_STATUSES: readonly AudioStatus[] = [
  AudioStatus.PLAYING,
  AudioStatus.PAUSED
]

export const AUDIO_STATUS_LABELS: Partial<Record<AudioStatus, string>> = {
  [AudioStatus.LOADING]: '加载中',
  [AudioStatus.PLAYING]: '暂停',
  [AudioStatus.PAUSED]: '继续',
  [AudioStatus.FAILED]: '重试'
}

export const AUDIO_BUTTON_ASSETS = {
  [AudioButtonVariant.LARGE]: { play: playLarge, activePlay: playLarge, pause: pauseLarge },
  [AudioButtonVariant.INLINE]: { play: playGreen, activePlay: playGreen, pause: pauseGreen },
  [AudioButtonVariant.PILL]: { play: playWhite, activePlay: playWhite, pause: pauseWhite },
  [AudioButtonVariant.COMPACT]: { play: playGreen, activePlay: playWhite, pause: pauseWhite }
} satisfies Record<AudioButtonVariant, { play: string; activePlay: string; pause: string }>
