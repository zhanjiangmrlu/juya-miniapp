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

/** 先校验服务端凭证大小，再上传并只返回可提交的对象键。 */
export async function uploadFeedbackImage(
  service: FeedbackService,
  file: FeedbackScreenshotDraft,
  uploader: FeedbackUploader = uploadWithUni
): Promise<string> {
  const credential = await service.getUploadCredential(file.mimeType)
  if (file.size > credential.max_bytes) throw new Error('FEEDBACK_SCREENSHOT_TOO_LARGE')
  await uploader(file, credential)
  return credential.key
}
