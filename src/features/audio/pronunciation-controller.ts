import {
  PRONUNCIATION_POLL_INITIAL_MS,
  PRONUNCIATION_POLL_MAX_MS,
  PRONUNCIATION_POLL_TIMEOUT_MS
} from '@/shared/constants/audio'
import { PronunciationStatus } from '@/shared/enums/audio'

import type {
  PronunciationContext,
  PronunciationResult,
  PronunciationTarget
} from '@/shared/contracts/audio'
import type { AudioTarget } from '@/shared/contracts/learning'
import type { AudioCancellationSignal, PronunciationService } from '@/shared/types/audio'

/** 创建发音播放键，target 为确认读音，context 为当前原文或本人收藏引用 */
export const getPronunciationAudioTarget = (
  target: PronunciationTarget,
  context: PronunciationContext
): AudioTarget => ({
  target_id: target.target_id,
  target_type: 'pronunciation',
  version_id: target.resource_version ?? '',
  resource_version: target.resource_version,
  purpose: context.favorite_id ? 'FAVORITE_REVIEW' : 'CONTENT',
  context
})

/** 创建取消错误，供播放器忽略被新目标替换的结果 */
const cancelled = (): Error => Object.assign(new Error('发音请求已取消'), { name: 'AbortError' })

/** 在剩余准备窗口内等待一次请求，work 为服务请求或计时器，signal 为取消信号，remaining 为剩余毫秒 */
const bounded = <T>(
  work: Promise<T>,
  signal: AudioCancellationSignal,
  remaining: number
): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    /** 清除单次等待的计时与监听 */
    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
    /** 立即结束已失效的用户动作 */
    const abort = () => {
      cleanup()
      reject(cancelled())
    }
    const timer = setTimeout(() => {
      cleanup()
      resolve(undefined)
    }, remaining)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) {
      abort()
      return
    }
    void work.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error: unknown) => {
        cleanup()
        reject(error)
      }
    )
  })

/** 解析受控目标，target 为确认读音，context 为内容或收藏授权，service 为请求端口，signal 为切页取消信号 */
export const resolvePronunciation = async (
  target: PronunciationTarget,
  context: PronunciationContext,
  service: PronunciationService,
  signal: AudioCancellationSignal
): Promise<PronunciationResult> => {
  if (signal.aborted) throw cancelled()
  const deadline = Date.now() + PRONUNCIATION_POLL_TIMEOUT_MS
  let result = await bounded(
    service.resolve(target, context),
    signal,
    PRONUNCIATION_POLL_TIMEOUT_MS
  )
  let interval = PRONUNCIATION_POLL_INITIAL_MS
  while (result?.status === PronunciationStatus.PREPARING && result.task_id) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    await bounded(new Promise<never>(() => undefined), signal, Math.min(interval, remaining))
    if (signal.aborted) throw cancelled()
    if (Date.now() >= deadline) break
    result = await bounded(
      service.task(result.task_id, context, target),
      signal,
      deadline - Date.now()
    )
    interval = Math.min(interval + 500, PRONUNCIATION_POLL_MAX_MS)
  }
  if (signal.aborted) throw cancelled()
  if (!result || result.status === PronunciationStatus.PREPARING)
    return { status: PronunciationStatus.FAILED, code: 'PREPARATION_TIMEOUT', can_retry: true }
  return result
}
