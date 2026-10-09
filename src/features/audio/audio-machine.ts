import type { AudioTarget } from '@/shared/contracts/learning'
import type { AudioStatus } from '@/shared/enums/audio'

export type { AudioStatus } from '@/shared/enums/audio'

export interface AudioSnapshot {
  currentTimeMs?: number
  status: AudioStatus
  target: AudioTarget | null
}

/** 生成稳定播放键，target 为资源及句子区间，避免对象引用导致重复播放 */
export const getAudioTargetKey = (target: AudioTarget): string => {
  return [
    target.target_type,
    target.target_id,
    target.version_id,
    target.scene_id ?? '',
    target.revision_id ?? '',
    target.resource_id ?? '',
    target.sentence_id ?? '',
    target.start_ms ?? '',
    target.end_ms ?? ''
  ].join(':')
}

/** 比较固定版本资源，left 为当前目标，right 为新播放意图 */
export const isSameAudioTarget = (left: AudioTarget | null, right: AudioTarget): boolean => {
  return left ? getAudioTargetKey(left) === getAudioTargetKey(right) : false
}
