import {
  adaptShortReadingDetail,
  adaptShortReadingPreview,
  adaptShortReadingProgress
} from '@/features/short-reading/short-reading-response'
import { ApiError } from '@/services/http/errors'
import { ShortReadingAccess, ShortReadingKind } from '@/shared/enums/short-reading'

import type { SignedResourceResponse } from '@/shared/contracts/learning'
import type {
  ShortReadingAudioTarget,
  ShortReadingListResponse,
  ShortReadingSummary,
  ShortReadingWireCompletion,
  ShortReadingWireDetail,
  ShortReadingWirePreview,
  ShortReadingWireProgress
} from '@/shared/contracts/short-reading'
import type { HttpClient } from '@/shared/types/http'
import type { ShortReadingService } from '@/shared/types/short-reading'

/** 取安全摘要白名单，value 为服务端列表或预览资料，不保留任何受限字段 */
export const toShortReadingSummary = (value: ShortReadingSummary): ShortReadingSummary => ({
  content_id: value.content_id,
  content_type: ShortReadingKind.CONTENT,
  title_en: value.title_en,
  title_zh: value.title_zh,
  category: value.category,
  topic: value.topic,
  level: value.level,
  intro: value.intro,
  cover_url: value.cover_url,
  access: value.access,
  is_trial: value.is_trial,
  progress_summary: value.progress_summary
    ? { completed_at: value.progress_summary.completed_at }
    : null
})

/** 创建独立短文服务，client 为统一登录、刷新、错误与幂等请求端口 */
export const createShortReadingService = (client: HttpClient): ShortReadingService => ({
  /** 分页保留后台顺序，cursor 为上一页返回的游标 */
  list: async (cursor) => {
    const response = await client.get<
      Omit<ShortReadingListResponse, 'items'> & { items: ShortReadingWirePreview[] }
    >(`/api/v1/short-readings${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
    return { ...response, items: response.items.map(adaptShortReadingPreview) }
  },
  /** 只读取安全摘要，contentId 为稳定短文标识 */
  preview: async (contentId) =>
    adaptShortReadingPreview(
      await client.get<ShortReadingWirePreview>(
        `/api/v1/short-readings/${encodeURIComponent(contentId)}/preview`
      )
    ),
  /** 打开同一版本的纯阅读资料，contentId 为当前请求的稳定短文标识 */
  open: async (contentId) => {
    const response = await client.post<ShortReadingWireDetail>(
      `/api/v1/short-readings/${encodeURIComponent(contentId)}/open`
    )
    const readable: string[] = [
      ShortReadingAccess.TRIAL,
      ShortReadingAccess.FORMAL,
      ShortReadingAccess.LIMITED
    ]
    if (!readable.includes(response.access))
      throw new ApiError('SHORT_READING_NO_ACCESS', '当前账号暂未开通此内容', 403)
    if (
      response.content_type !== ShortReadingKind.CONTENT ||
      response.content_id !== contentId ||
      !Number.isInteger(response.content_version) ||
      response.content_version < 1 ||
      !response.paragraphs_en?.length ||
      !response.translation_zh
    ) {
      throw new ApiError('SHORT_READING_CONTRACT_UNAVAILABLE', '短文内容暂不可用', 409)
    }
    return adaptShortReadingDetail(response)
  },
  /** 保存短文段落位置，contentId 为短文标识，position 为版本锚点及序号，idempotencyKey 为重试键 */
  savePosition: async (contentId, position, idempotencyKey) =>
    adaptShortReadingProgress(
      await client.put<ShortReadingWireProgress>(
        `/api/v1/short-readings/${encodeURIComponent(contentId)}/progress`,
        position,
        {
          idempotencyKey
        }
      ),
      contentId,
      position.content_version
    ),
  /** 主动标记短文读完，contentId 为稳定ID，contentVersion 为读到的发布版本，idempotencyKey 为命令重试键 */
  complete: async (contentId, contentVersion, idempotencyKey) => {
    const response = await client.post<ShortReadingWireCompletion>(
      `/api/v1/short-readings/${encodeURIComponent(contentId)}/complete`,
      { content_version: contentVersion },
      {
        idempotencyKey
      }
    )
    const value = response.progress
    if (
      !value ||
      value.content_id !== contentId ||
      value.saved_content_version !== contentVersion ||
      !value.completed_at
    )
      throw new ApiError('SHORT_READING_COMPLETION_INVALID', '短文完成状态不一致，请重新打开', 409)
    return {
      progress: adaptShortReadingProgress(value, contentId, contentVersion),
      created: response.created
    }
  },
  /** 只签当前短文的整篇资源，target 为详情返回的固定版本资源，禁止回退到场景或通用媒体接口 */
  getSignedUrl: async (target) => {
    const readingTarget = target as ShortReadingAudioTarget
    if (
      readingTarget.content_type !== ShortReadingKind.CONTENT ||
      !readingTarget.content_id ||
      !readingTarget.revision_id ||
      !readingTarget.resource_id ||
      target.scene_id
    ) {
      throw new ApiError('SHORT_READING_AUDIO_TARGET_INVALID', '短文音频暂不可用', 409)
    }
    const result = await client.get<SignedResourceResponse>(
      `/api/v1/short-readings/${encodeURIComponent(readingTarget.content_id)}/resources/${encodeURIComponent(readingTarget.resource_id)}/signed-url?revision_id=${encodeURIComponent(readingTarget.revision_id)}`
    )
    return { ...result, target_id: target.target_id }
  }
})
