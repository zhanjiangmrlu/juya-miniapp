import { resourceURL } from './platform'
import { runtimeMode } from './runtime-mode'

/** 用原生图片解码器核对已下载公开图的真实规格，不信任文件后缀或服务端声明
 * @param src 本次公开封面下载得到的本地临时文件
 * @param width 原生渠道规定的实际像素宽度
 * @param height 原生渠道规定的实际像素高度
 */
const decodeCover = (src: string, width: number, height: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('分享封面解码超时，请重试')),
      SHARE_DECODE_TIMEOUT_MS
    )
    try {
      const canvas = uni.createOffscreenCanvas({ type: '2d', width: 1, height: 1 }),
        image = canvas.createImage()
      image.onload = () => {
        clearTimeout(timer)
        if (image.width === width && image.height === height) resolve(src)
        else reject(new Error('分享封面比例暂不可用'))
      }
      image.onerror = () => {
        clearTimeout(timer)
        reject(new Error('分享封面解码失败，请重试'))
      }
      image.src = src
    } catch {
      clearTimeout(timer)
      reject(new Error('分享封面暂未准备好，请重试'))
    }
  })

/** 下载服务器派生的公开分享图并核对真实像素，不携带业务凭证
 * @param path 当前发布版本的公开封面路径
 * @param width 对应原生渠道要求的像素宽度
 * @param height 对应原生渠道要求的像素高度
 */
export const downloadShareCover = async (
  path: string,
  width: number,
  height: number
): Promise<string> => {
  if (
    !/^\/api\/mini\/v1\/public\/cards\/[A-Za-z0-9-]{1,64}\/share\/images\/[A-Za-z0-9-]{1,64}\/(friends|timeline)$/.test(
      path
    )
  )
    throw new Error('公开分享封面地址暂不可用')
  return new Promise((resolve, reject) =>
    uni.downloadFile({
      url: resourceURL(path),
      header: {},
      timeout: 20000,
      success: (result) => {
        if (result.statusCode !== 200 || !result.tempFilePath) {
          reject(new Error('分享封面暂未准备好，请重试'))
          return
        }
        uni.getImageInfo({
          src: result.tempFilePath,
          success: (info) =>
            info.width === width && info.height === height
              ? resolve(result.tempFilePath)
              : reject(new Error('分享封面比例暂不可用')),
          fail: () => decodeCover(result.tempFilePath, width, height).then(resolve, reject)
        })
      },
      fail: () => reject(new Error('分享封面暂未准备好，请重试'))
    })
  )
}

/** 微信完整模式仅在本地封面备齐后开放分享，摘要模式只展示公开地址
 * @param path 服务端已验证的公开派生封面路径
 * @param width 原生渠道要求的宽度
 * @param height 原生渠道要求的高度
 */
export const prepareShareCover = (path: string, width: number, height: number): Promise<string> => {
  if (runtimeMode.update()) return Promise.resolve(resourceURL(path))
  // #ifdef MP-WEIXIN
  return downloadShareCover(path, width, height)
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(resourceURL(path))
  // #endif
}
import { SHARE_DECODE_TIMEOUT_MS } from '@/shared/constants/share'
