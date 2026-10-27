import { WORD_AUDIO_DIAGNOSTIC_LIMIT } from '@/shared/constants/media'

import type { WordAudioDiagnostic } from '@/shared/types/audio'

import { ApiError } from './errors'

const entries: WordAudioDiagnostic[] = []

/** 测试构建仅保留耗时和错误代码，绝不保存原始错误文案或资源地址
 * @param stage 当前音频准备或播放阶段
 * @param started 本阶段起始毫秒时间
 * @param outcome 已完成、失败或取消
 * @param reason 可选的服务端或原生错误，仅提取安全代码
 * @param details 已确认的音源类型或文件格式，不包含地址
 */
export const recordWordAudio = (
  stage: WordAudioDiagnostic['stage'],
  started: number,
  outcome: WordAudioDiagnostic['outcome'],
  reason?: unknown,
  details?: Pick<WordAudioDiagnostic, 'source' | 'format'>
) => {
  if (import.meta.env.MODE !== 'test') return
  const native = reason as { errCode?: unknown } | undefined
  const raw = reason instanceof ApiError ? reason.code : native?.errCode
  const code = typeof raw === 'number' || typeof raw === 'string' ? String(raw) : ''
  entries.push({
    stage,
    outcome,
    elapsed: Math.max(0, Date.now() - started),
    ...(details?.source ? { source: details.source } : {}),
    ...(details?.format ? { format: details.format } : {}),
    ...(code && /^[a-z0-9_.-]{1,64}$/i.test(code) ? { code } : {}),
    ...(reason instanceof ApiError ? { status: reason.status } : {})
  })
  if (entries.length > WORD_AUDIO_DIAGNOSTIC_LIMIT) entries.shift()
  console.info('[word-audio]', entries.at(-1))
}

/** 只返回诊断快照，避免调试代码修改实际记录 */
export const readWordAudioDiagnostics = () => entries.map((entry) => ({ ...entry }))

/** 清理本轮测试诊断，不接触业务音频或身份状态 */
export const clearWordAudioDiagnostics = () => {
  entries.length = 0
}
