import { DEFAULT_PLAYBACK_RATE } from '@/shared/constants/audio'

import type { LearningAudioSession } from '@/shared/types/audio'

export const learningAudioSession: LearningAudioSession = { rate: DEFAULT_PLAYBACK_RATE }

/** 新学习会话或退出身份时重置内存倍速，不保存到服务器或本地存储 */
export const resetLearningAudioSession = () => {
  learningAudioSession.rate = DEFAULT_PLAYBACK_RATE
}
