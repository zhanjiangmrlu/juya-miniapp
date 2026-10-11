import { PronunciationStatus } from '@/shared/enums/audio'

import type {
  PronunciationContext,
  PronunciationResult,
  PronunciationTarget,
  PronunciationWireResult
} from '@/shared/contracts/audio'

/** 提交BFF公共白名单引用，context 为授权来源，target 为可选固定资源，不提交文本、供应商配置及用户身份 */
const reference = (context: PronunciationContext, target?: PronunciationTarget) => ({
  ...(context.favorite_id
    ? { favorite_id: context.favorite_id }
    : {
        content_type: context.content_type,
        content_id: context.content_id,
        content_version: context.content_version,
        entry_id: context.entry_id,
        sense_id: context.sense_id,
        source_id: context.source_id
      }),
  resource_version: target?.resource_version
})
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
        reference(context, target)
      )
    ),
  task: (taskId, context, target) => {
    const query = Object.entries({ ...reference(context, target), target_id: target?.target_id })
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
