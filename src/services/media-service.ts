import type { components } from '@/shared/contracts/generated/mini-api'

import { session } from './api'
import { resourceURL } from './platform'

/** 为当前内容或本人历史缩略图获取短期受控地址
 * @param cardId 稳定卡片编号
 * @param mediaId 当前版本或摘要允许的素材引用
 * @param versionId 已确认的发布版本
 * @param summary 是否只读取本人历史的安全缩略图
 */
export const mediaAddress = async (
  cardId: string,
  mediaId: string,
  versionId?: string | null,
  summary = false
) => {
  const query = `purpose=${summary ? 'summary' : 'content'}${versionId ? `&version_id=${encodeURIComponent(versionId)}` : ''}`
  const result = await session.request<components['schemas']['ResourceURL']>(
    `/api/mini/v1/cards/${encodeURIComponent(cardId)}/media/${encodeURIComponent(mediaId)}/url?${query}`
  )
  return resourceURL(result.url)
}
