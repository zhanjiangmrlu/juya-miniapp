import type { ImagePreviewContext } from '@/shared/types/image-preview'
let current: ImagePreviewContext | null = null
/** 点击查看后准备原图文件，原生预处理失败时由图片组件直接加载同一授权原图
 * @param url 当前发布版本已授权的原图地址
 */
export const prepareImagePreviewSource = async (url: string): Promise<string> => {
  runtimeMode.assertPrivate()
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    uni.getImageInfo({
      src: url,
      success: (image) => resolve(image.path),
      fail: (reason) => {
        console.warn(
          '[scene-image] 原图准备失败',
          reason.errMsg.replace(/https?:\/\/\S+/g, '[资源地址]')
        )
        resolve(url)
      }
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
/** 清除分享摘要模式不再允许展示的原图上下文 */
export const discardImagePreview = () => {
  if (current) closeImagePreview(current)
}
/** 关闭覆盖层时通知父页，保留其译文、音频与滚动状态
 * @param context 被关闭的覆盖层上下文
 */
export const closeImagePreview = (context: ImagePreviewContext) => {
  if (current === context) {
    current = null
    context.onClose()
  }
}
import { runtimeMode } from './runtime-mode'
