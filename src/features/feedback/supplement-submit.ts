import type { FeedbackItem } from '@/shared/contracts/feedback'
import type { FeedbackScreenshotDraft, FeedbackService } from '@/shared/types/feedback'

import { validateFeedbackDraft } from './feedback-form'
import { uploadFeedbackImage } from './upload-service'
/** 提交一次补充，service 为接口，item 为现有记录，text 为说明，screenshot 为可选本机附件 */
export const submitSupplement = async (
  service: FeedbackService,
  item: FeedbackItem,
  text: string,
  screenshot?: FeedbackScreenshotDraft
) => {
  const validation = validateFeedbackDraft({
    category: 'CONTENT',
    description: text,
    screenshots: screenshot ? [screenshot] : []
  })
  if (!validation.valid || !validation.normalized)
    throw new Error(Object.values(validation.errors)[0])
  if (screenshot && item.screenshots.length) throw new Error('整条反馈最多上传 1 张截图')
  const key = screenshot ? await uploadFeedbackImage(service, screenshot) : undefined
  return service.supplement(item.id, validation.normalized.description, key ? [key] : [])
}
