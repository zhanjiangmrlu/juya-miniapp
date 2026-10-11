import { ShortReadingAccess, ShortReadingKind } from '@/shared/enums/short-reading'

import type {
  ShortReadingDetail,
  ShortReadingHistoryPage,
  ShortReadingProgress,
  ShortReadingSummary,
  ShortReadingWireDetail,
  ShortReadingWirePreview,
  ShortReadingWireProgress
} from '@/shared/contracts/short-reading'

/** 只提取阅读历史许可摘要，value为本人分页数据，不传播正文、音频或段落锚点 */
export const adaptShortReadingHistory = (
  value: ShortReadingHistoryPage
): ShortReadingHistoryPage => ({
  started_count: value.started_count,
  completed_count: value.completed_count,
  next_cursor: value.next_cursor,
  has_more: value.has_more,
  items: value.items.map((item) => ({
    content_id: item.content_id,
    title_en: item.title_en,
    title_zh: item.title_zh,
    saved_content_version: item.saved_content_version,
    started_at: item.started_at,
    last_read_at: item.last_read_at,
    completed_at: item.completed_at,
    can_open: item.can_open === true
  }))
})

/** 适配BFF安全预览白名单，value 为服务端元信息，不传播额外受限字段 */
export const adaptShortReadingPreview = (value: ShortReadingWirePreview): ShortReadingSummary => ({
  content_type: ShortReadingKind.CONTENT,
  content_id: value.content_id,
  title_en: value.title_en,
  title_zh: value.title_zh,
  category: value.category,
  topic: value.topic,
  level: value.level,
  intro: value.introduction,
  cover_url: value.cover_url,
  access: value.access,
  is_trial: value.access === ShortReadingAccess.TRIAL,
  progress_summary: value.progress_summary
    ? { completed_at: value.progress_summary.completed_at }
    : null
})

/** 适配独立进度，value 为BFF字符锚点，contentId 为短文ID，contentVersion 为当前发布版本 */
export const adaptShortReadingProgress = (
  value: ShortReadingWireProgress | null,
  contentId: string,
  contentVersion: number
): ShortReadingProgress => ({
  content_type: ShortReadingKind.CONTENT,
  content_id: contentId,
  content_version: value?.saved_content_version ?? contentVersion,
  client_sequence: value?.client_sequence ?? 0,
  // uni-app没有字符位置测量端口，跨会话恢复到稳定段落开头，不把字符数当像素或猜测旧版本位置
  position: value?.paragraph_id ? { paragraph_id: value.paragraph_id, offset: 0 } : null,
  started_at: value?.started_at ?? null,
  last_read_at: value?.last_read_at ?? null,
  completed_at: value?.completed_at ?? null
})

/** 将BFF纯阅读资料转换为页面模型，value 为固定发布版本且不含场景词条的详情 */
export const adaptShortReadingDetail = (value: ShortReadingWireDetail): ShortReadingDetail => ({
  ...adaptShortReadingPreview(value),
  content_version: value.content_version,
  revision_id: value.revision_id,
  paragraphs_en: value.paragraphs_en.map((paragraph) => ({
    paragraph_id: paragraph.paragraph_id,
    text: paragraph.english
  })),
  translation_zh: value.translation_zh,
  whole_audio: value.whole_audio
    ? {
        content_id: value.content_id,
        content_type: ShortReadingKind.CONTENT,
        content_version: value.content_version,
        revision_id: value.revision_id,
        resource_id: value.whole_audio.target_id,
        target_id: value.whole_audio.target_id,
        target_type: ShortReadingKind.WHOLE_AUDIO,
        version_id: value.whole_audio.resource_version,
        duration_ms: value.whole_audio.duration_ms,
        context: {
          content_type: ShortReadingKind.CONTENT,
          content_id: value.content_id,
          content_version: value.content_version
        }
      }
    : null,
  progress: adaptShortReadingProgress(value.progress, value.content_id, value.content_version)
})
