import { resourceURL } from './platform'
import { runtimeMode } from './runtime-mode'

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
          fail: () => reject(new Error('分享封面暂未准备好，请重试'))
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
