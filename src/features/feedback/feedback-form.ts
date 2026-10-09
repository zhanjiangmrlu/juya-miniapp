import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  FEEDBACK_DESCRIPTION_MIN_LENGTH,
  FEEDBACK_IMAGE_MAX_BYTES,
  FEEDBACK_IMAGE_MIME_TYPES,
  FEEDBACK_REOPEN_LIMIT,
  FEEDBACK_REOPEN_WINDOW_MS,
  FEEDBACK_SCREENSHOT_LIMIT
} from '@/shared/constants/feedback'
import { FeedbackStatus } from '@/shared/enums/feedback'

import type { FeedbackItem } from '@/shared/contracts/feedback'
import type {
  FeedbackDraft,
  FeedbackDraftValidation,
  FeedbackSupplementValidation
} from '@/shared/types/feedback'

export { FEEDBACK_CATEGORIES } from '@/shared/constants/feedback'
export { FEEDBACK_IMAGE_MIME_TYPES } from '@/shared/constants/feedback'
export { FEEDBACK_IMAGE_MAX_BYTES } from '@/shared/constants/feedback'
export type { FeedbackScreenshotDraft } from '@/shared/types/feedback'
export type { FeedbackDraft } from '@/shared/types/feedback'
export type { FeedbackDraftValidation } from '@/shared/types/feedback'

/** 校验反馈分类、去空白后的正文及单张图片限制，并返回可直接提交的标准值 */
export const validateFeedbackDraft = (draft: FeedbackDraft): FeedbackDraftValidation => {
  const description = draft.description.trim()
  const errors: FeedbackDraftValidation['errors'] = {}
  const categoryAllowed = FEEDBACK_CATEGORIES.some((item) => item.value === draft.category)
  if (!categoryAllowed) errors.category = '请选择问题分类'
  if (
    description.length < FEEDBACK_DESCRIPTION_MIN_LENGTH ||
    description.length > FEEDBACK_DESCRIPTION_MAX_LENGTH
  )
    errors.description = '补充说明需为 1 至 300 字'

  if (draft.screenshots.length > FEEDBACK_SCREENSHOT_LIMIT) {
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
export const validateSupplement = (text: string): FeedbackSupplementValidation => {
  const normalized = text.trim()
  return normalized.length >= FEEDBACK_DESCRIPTION_MIN_LENGTH &&
    normalized.length <= FEEDBACK_DESCRIPTION_MAX_LENGTH
    ? { normalized, valid: true }
    : { valid: false }
}

/** 仅在服务端明确要求补充且已有管理员回复时开放补充入口 */
export const canSupplementFeedback = (feedback: FeedbackItem): boolean => {
  return feedback.status === FeedbackStatus.NEEDS_SUPPLEMENT && Boolean(feedback.reply?.trim())
}

/** 依据处理时间与已重开次数生成结果页操作，不在客户端改变服务端反馈状态 */
export const getResolutionActions = (feedback: FeedbackItem, now = new Date()) => {
  const resolvedAt = feedback.resolved_at ? new Date(feedback.resolved_at) : undefined
  const withinSevenDays = resolvedAt
    ? now.getTime() >= resolvedAt.getTime() &&
      now.getTime() - resolvedAt.getTime() <= FEEDBACK_REOPEN_WINDOW_MS
    : false
  return {
    canReopen:
      feedback.status === FeedbackStatus.RESOLVED &&
      withinSevenDays &&
      (feedback.reopen_count ?? 0) < FEEDBACK_REOPEN_LIMIT,
    reopenPrimaryLabel: '仍有问题',
    reopenSecondaryLabel: '（可重开一次）',
    showResolvedAction: feedback.status === FeedbackStatus.RESOLVED && withinSevenDays
  }
}
