import { FeedbackCategory } from '@/shared/enums/feedback'

import type { FeedbackItem } from '@/shared/contracts/feedback'
import type { FeedbackScreenshotDraft, FeedbackService } from '@/shared/types/feedback'

import { validateFeedbackDraft } from './feedback-form'
import { uploadFeedbackImage } from './upload-service'
/** 提交一次补充，service 为接口，item 为现有记录，text 为说明，screenshot 为本机附件，isCurrent 核对原会话仍可提交 */
export const submitSupplement = async (
  service: FeedbackService,
  item: FeedbackItem,
  text: string,
  screenshot?: FeedbackScreenshotDraft,
  isCurrent: () => boolean = () => true
) => {
  if (!isCurrent()) throw new Error('FEEDBACK_REQUEST_CANCELLED')
  const validation = validateFeedbackDraft({
    category: FeedbackCategory.CONTENT,
    description: text,
    screenshots: screenshot ? [screenshot] : []
  })
  if (!validation.valid || !validation.normalized)
    throw new Error(Object.values(validation.errors)[0])
  if (screenshot && item.screenshots.length) throw new Error('整条反馈最多上传 1 张截图')
  const key = screenshot
    ? await uploadFeedbackImage(service, screenshot, undefined, isCurrent)
    : undefined
  if (!isCurrent()) throw new Error('FEEDBACK_REQUEST_CANCELLED')
  return service.supplement(item.id, validation.normalized.description, key ? [key] : [])
}
