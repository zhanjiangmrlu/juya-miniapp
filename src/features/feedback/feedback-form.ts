import type { FeedbackItem } from '@/shared/contracts/feedback'

export const FEEDBACK_CATEGORIES = [
  { label: '内容问题', value: 'CONTENT' },
  { label: '发音问题', value: 'PRONUNCIATION' },
  { label: '显示问题', value: 'DISPLAY' },
  { label: '功能问题', value: 'FUNCTION' }
] as const

export const FEEDBACK_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export interface FeedbackScreenshotDraft {
  mimeType: string
  path: string
  size: number
}

export interface FeedbackDraft {
  category: string
  description: string
  screenshots: FeedbackScreenshotDraft[]
  source?: Record<string, string>
}

export interface FeedbackDraftValidation {
  errors: { category?: string; description?: string; screenshot?: string }
  normalized?: Pick<FeedbackDraft, 'category' | 'description' | 'screenshots' | 'source'>
  valid: boolean
}

/** 校验反馈分类、去空白后的正文及单张图片限制，并返回可直接提交的标准值 */
export const validateFeedbackDraft = (draft: FeedbackDraft): FeedbackDraftValidation => {
  const description = draft.description.trim()
  const errors: FeedbackDraftValidation['errors'] = {}
  const categoryAllowed = FEEDBACK_CATEGORIES.some((item) => item.value === draft.category)
  if (!categoryAllowed) errors.category = '请选择问题分类'
  if (description.length < 1 || description.length > 300)
    errors.description = '补充说明需为 1 至 300 字'

  if (draft.screenshots.length > 1) {
    errors.screenshot = '最多上传 1 张截图'
  } else if (draft.screenshots[0]) {
    const screenshot = draft.screenshots[0]
    if (!FEEDBACK_IMAGE_MIME_TYPES.includes(screenshot.mimeType as never))
      errors.screenshot = '仅支持 JPG、PNG 或 WebP 图片'
    else if (screenshot.size > FEEDBACK_IMAGE_MAX_BYTES) errors.screenshot = '截图不能超过 5 MiB'
  }

  if (Object.keys(errors).length > 0) return { errors, valid: false }
  return {
    errors,
    normalized: {
      category: draft.category,
      description,
      screenshots: [...draft.screenshots],
      source: draft.source
    },
    valid: true
  }
}

/** 截图上传失败时保留本地附件用于重试，draft 为用户已填写的文字、来源及单张截图 */
export const preserveDraftAfterUploadFailure = (draft: FeedbackDraft): FeedbackDraft => {
  return { ...draft, screenshots: [...draft.screenshots] }
}

/** 校验补充说明并返回去除首尾空白后的提交值 */
export const validateSupplement = (text: string): { normalized?: string; valid: boolean } => {
  const normalized = text.trim()
  return normalized.length >= 1 && normalized.length <= 300
    ? { normalized, valid: true }
    : { valid: false }
}

/** 仅在服务端明确要求补充且已有管理员回复时开放补充入口 */
export const canSupplementFeedback = (feedback: FeedbackItem): boolean => {
  return feedback.status === 'NEEDS_SUPPLEMENT' && Boolean(feedback.reply?.trim())
}

/** 依据处理时间与已重开次数生成结果页操作，不在客户端改变服务端反馈状态 */
export const getResolutionActions = (feedback: FeedbackItem, now = new Date()) => {
  const resolvedAt = feedback.resolved_at ? new Date(feedback.resolved_at) : undefined
  const withinSevenDays = resolvedAt
    ? now.getTime() >= resolvedAt.getTime() &&
      now.getTime() - resolvedAt.getTime() <= 7 * 24 * 60 * 60 * 1000
    : false
  return {
    canReopen:
      feedback.status === 'RESOLVED' && withinSevenDays && (feedback.reopen_count ?? 0) < 1,
    reopenPrimaryLabel: '仍有问题',
    reopenSecondaryLabel: '（可重开一次）',
    showResolvedAction: feedback.status === 'RESOLVED' && withinSevenDays
  }
}
