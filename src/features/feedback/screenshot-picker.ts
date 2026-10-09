import { FEEDBACK_IMAGE_MAX_BYTES, FEEDBACK_IMAGE_MIME_TYPES } from '@/shared/constants/feedback'
import { FeedbackImageContentType } from '@/shared/enums/feedback'

import type { FeedbackScreenshotDraft, PickedFeedbackFile } from '@/shared/types/feedback'
/** 选择截图，select 为成功后的附件回调，fail 为可展示的校验提示 */
export const chooseFeedbackScreenshot = (
  select: (file: FeedbackScreenshotDraft) => void,
  fail: (message: string) => void
) =>
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (result) => {
      const file = (result.tempFiles as Array<PickedFeedbackFile>)[0]
      if (!file) return
      const extension = file.path.split('.').pop()?.toLocaleLowerCase()
      const mimeType =
        file.type ||
        (extension === 'png'
          ? FeedbackImageContentType.PNG
          : extension === 'webp'
            ? FeedbackImageContentType.WEBP
            : extension === 'gif'
              ? 'image/gif'
              : FeedbackImageContentType.JPEG)
      if (!FEEDBACK_IMAGE_MIME_TYPES.includes(mimeType as never)) {
        fail('仅支持 JPG、PNG 或 WebP 图片')
        return
      }
      if (file.size > FEEDBACK_IMAGE_MAX_BYTES) {
        fail('截图不能超过 5 MiB')
        return
      }
      select({ path: file.path, size: file.size, mimeType })
    },
    fail: (error) => {
      if (!error.errMsg.includes('cancel')) fail('选择截图未完成，请重试')
    }
  })
