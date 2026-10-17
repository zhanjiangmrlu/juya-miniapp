import type { ImagePreviewContext } from '@/shared/types/image-preview'
let current: ImagePreviewContext | null = null
/** 为当前场景注册原生页面栈上的全屏覆盖层
 * @param context 同一发布版本的图片及父页面通知
 */
export const registerImagePreview = (context: ImagePreviewContext) => {
  current = context
  return () => {
    if (current === context) current = null
  }
}
/** 只允许由当前详情页传入的图片上下文 */
export const activeImagePreview = () => current
/** 关闭覆盖层时通知父页，保留其译文、音频与滚动状态
 * @param context 被关闭的覆盖层上下文
 */
export const closeImagePreview = (context: ImagePreviewContext) => {
  if (current === context) {
    current = null
    context.onClose()
  }
}
