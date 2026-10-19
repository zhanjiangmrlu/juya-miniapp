import type { ImagePreviewContext } from '@/shared/types/image-preview'
let current: ImagePreviewContext | null = null
/** 将微信原图下载为临时文件，详情缩略展示与大图共用，避免 no-store 资源重复下载
 * @param url 当前发布版本已授权的原图地址
 */
export const prepareImagePreviewSource = async (url: string): Promise<string> => {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: url,
      success: (image) => resolve(image.path),
      fail: () => reject(new Error('图片暂未加载，可重试'))
    })
  })
  // #endif
  // #ifndef MP-WEIXIN
  return url
  // #endif
}
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
