import { PronunciationStatus } from '@/shared/enums/audio'

import type { PronunciationResult, PronunciationWireResult } from '@/shared/contracts/audio'
import type { PronunciationService } from '@/shared/types/audio'
import type { HttpClient } from '@/shared/types/http'

/** 将读音自身缺资源的错误降级，request 为受控请求，完整权限错误继续由播放器处理 */
const requestPronunciation = async (
  request: Promise<PronunciationWireResult>
): Promise<PronunciationResult> => {
  try {
    const result = await request
    const status =
      result.status === PronunciationStatus.READY ||
      result.status === PronunciationStatus.UNAVAILABLE
        ? result.status
        : ['PREPARING', 'RUNNING', 'RETRY', 'RECOVER'].includes(result.status)
          ? PronunciationStatus.PREPARING
          : PronunciationStatus.FAILED
    return {
      ...result,
      status,
      code: result.code ?? result.error_code ?? undefined,
      can_retry:
        status === PronunciationStatus.FAILED ? result.can_retry === true : result.can_retry
    }
  } catch (error) {
    const code = (error as { code?: string }).code
    if (
      code === 'PRONUNCIATION_UNAVAILABLE' ||
      code === 'TTS_DISABLED' ||
      code === 'TTS_TEXT_LIMIT'
    )
      return { status: PronunciationStatus.UNAVAILABLE, can_retry: false, code }
    throw error
  }
}

/** 创建受控发音请求，client 为统一会话请求层，不接受任意文本或合成配置 */
export const createPronunciationService = (client: HttpClient): PronunciationService => ({
  resolve: (target, context) =>
    requestPronunciation(
      client.post<PronunciationWireResult>(
        `/api/v1/pronunciations/${encodeURIComponent(target.target_id)}/resolve`,
        { ...context, resource_version: target.resource_version }
      )
    ),
  task: (taskId, context) => {
    const query = Object.entries(context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    return requestPronunciation(
      client.get<PronunciationWireResult>(
        `/api/v1/pronunciations/tasks/${encodeURIComponent(taskId)}${query ? `?${query}` : ''}`
      )
    )
  }
})
