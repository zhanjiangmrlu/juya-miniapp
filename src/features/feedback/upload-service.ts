import type { FeedbackUploadCredential } from '@/shared/contracts/feedback'
import type {
  FeedbackScreenshotDraft,
  FeedbackService,
  FeedbackUploader
} from '@/shared/types/feedback'

export type { FeedbackUploader } from '@/shared/types/feedback'

/** 使用服务端短期凭证把图片直传 OSS，不读取或记录图片正文。 */
export function uploadWithUni(
  file: FeedbackScreenshotDraft,
  credential: FeedbackUploadCredential
): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      fail: reject,
      filePath: file.path,
      formData: {
        ...credential.fields,
        'Content-Type': credential.content_type,
        success_action_status: '200'
      },
      name: 'file',
      success: (response) =>
        response.statusCode >= 200 && response.statusCode < 300
          ? resolve()
          : reject(new Error('UPLOAD_FAILED')),
      url: credential.host
    })
  })
}

/** 校验凭证后上传，service 为反馈接口，file 为截图，uploader 为直传端口，isCurrent 核对原会话仍可传图 */
export const uploadFeedbackImage = async (
  service: FeedbackService,
  file: FeedbackScreenshotDraft,
  uploader: FeedbackUploader = uploadWithUni,
  isCurrent: () => boolean = () => true
): Promise<string> => {
  if (!isCurrent()) throw new Error('FEEDBACK_REQUEST_CANCELLED')
  const credential = await service.getUploadCredential(file.mimeType)
  if (!isCurrent()) throw new Error('FEEDBACK_REQUEST_CANCELLED')
  if (file.size > credential.max_bytes) throw new Error('FEEDBACK_SCREENSHOT_TOO_LARGE')
  await uploader(file, credential)
  if (!isCurrent()) throw new Error('FEEDBACK_REQUEST_CANCELLED')
  return credential.key
}
