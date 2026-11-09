import { AnalyticsEvent } from '@/shared/enums/analytics'

import type { AnalyticsProperties } from '@/shared/types/analytics'
import type { OperationRecord } from '@/shared/types/operations'

/** 将已确认的学习操作映射为有限维度，不读取请求正文或个人资料
 * @param record 服务端已确认成功的原业务操作
 */
export const operationAnalytics = (
  record: OperationRecord
): { event: AnalyticsEvent; properties: AnalyticsProperties } | null => {
  const complete = /^\/api\/mini\/v1\/(cards|listening\/articles)\/([A-Za-z0-9-]+)\/complete$/.exec(
    record.path
  )
  if (record.method === 'POST' && complete)
    return {
      event: AnalyticsEvent.LEARNING_COMPLETE,
      properties: {
        content_type: complete[1] === 'cards' ? 'scene' : 'listening',
        content_id: complete[2]
      }
    }
  const favorite = /^\/api\/mini\/v1\/(cards|listening\/articles)\/([A-Za-z0-9-]+)\/favorite$/.exec(
    record.path
  )
  if (record.method === 'PUT' && favorite)
    return {
      event: AnalyticsEvent.FAVORITE_CHANGE,
      properties: {
        content_type: favorite[1] === 'cards' ? 'scene' : 'listening',
        content_id: favorite[2],
        favorite: 1
      }
    }
  const remove = /^\/api\/mini\/v1\/(listening\/)?favorites\/([A-Za-z0-9-]+)$/.exec(record.path)
  if (record.method === 'DELETE' && remove)
    return {
      event: AnalyticsEvent.FAVORITE_CHANGE,
      properties: {
        content_type: remove[1] ? 'listening' : 'scene',
        content_id: remove[2],
        favorite: 0
      }
    }
  // #ifdef JUYA_ANALYTICS
  if (record.method === 'PATCH' && record.path === '/api/mini/v1/me/profile')
    return { event: AnalyticsEvent.PROFILE_SAVE, properties: {} }
  if (record.method === 'PATCH' && record.path === '/api/mini/v1/me/contact')
    return { event: AnalyticsEvent.CONTACT_SAVE, properties: {} }
  if (record.method === 'POST' && record.path === '/api/mini/v1/feedback')
    return { event: AnalyticsEvent.FEEDBACK_SUBMIT, properties: {} }
  if (record.method === 'POST' && /^\/api\/mini\/v1\/feedback\/[\w-]+\/messages$/.test(record.path))
    return { event: AnalyticsEvent.FEEDBACK_REPLY, properties: {} }
  // #endif
  return null
}
