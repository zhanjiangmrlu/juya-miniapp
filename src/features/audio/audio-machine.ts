import type { AudioTarget } from '@/shared/contracts/learning'

export type AudioStatus = 'FAILED' | 'IDLE' | 'LOADING' | 'PAUSED' | 'PLAYING'

export interface AudioSnapshot {
  status: AudioStatus
  target: AudioTarget | null
}

/** 为音频目标生成稳定键，避免对象引用变化导致重复播放。 */
export function getAudioTargetKey(target: AudioTarget): string {
  return `${target.target_type}:${target.target_id}:${target.version_id}`
}

/** 判断两个音频目标是否指向同一版本资源。 */
export function isSameAudioTarget(left: AudioTarget | null, right: AudioTarget): boolean {
  return left ? getAudioTargetKey(left) === getAudioTargetKey(right) : false
}
