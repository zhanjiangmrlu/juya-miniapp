import { MEDIA_ADDRESS_CACHE_LIMIT, MEDIA_ADDRESS_EXPIRY_MARGIN_MS } from '@/shared/constants/media'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { MediaAddressCacheEntry } from '@/shared/types/media'

import { session } from './api'
import { resourceURL } from './platform'

const addresses = new Map<string, MediaAddressCacheEntry>()
/** 账号退出或重新登录时清除旧会话签发的临时资源 */
export const clearMediaAddresses = () => addresses.clear()

/** 为当前内容或本人历史缩略图获取短期受控地址
 * @param cardId 稳定卡片编号
 * @param mediaId 当前版本或摘要允许的素材引用
 * @param versionId 已确认的发布版本
 * @param summary 是否只读取本人历史的安全缩略图
 * @param renew 图片或音频加载失败后是否重新签发地址
 */
export const mediaAddress = async (
  cardId: string,
  mediaId: string,
  versionId?: string | null,
  summary = false,
  renew = false
) => {
  const key = JSON.stringify([session.userId(), cardId, mediaId, versionId, summary])
  const cached = addresses.get(key)
  if (!renew && cached && cached.expires > Date.now()) return cached.address
  const query = `purpose=${summary ? 'summary' : 'content'}${versionId ? `&version_id=${encodeURIComponent(versionId)}` : ''}`
  const entry: MediaAddressCacheEntry = {
    expires: Number.POSITIVE_INFINITY,
    address: session
      .request<components['schemas']['ResourceURL']>(
        `/api/mini/v1/cards/${encodeURIComponent(cardId)}/media/${encodeURIComponent(mediaId)}/url?${query}`
      )
      .then((result) => {
        entry.expires = Date.parse(result.expires_at) - MEDIA_ADDRESS_EXPIRY_MARGIN_MS
        return resourceURL(result.url)
      })
      .catch((reason: unknown) => {
        if (addresses.get(key) === entry) addresses.delete(key)
        throw reason
      })
  }
  addresses.delete(key)
  addresses.set(key, entry)
  if (addresses.size > MEDIA_ADDRESS_CACHE_LIMIT) addresses.delete(addresses.keys().next().value!)
  return entry.address
}
