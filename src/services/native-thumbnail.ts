import { THUMBNAIL_QUALITY } from '@/shared/constants/media'

import type { GeneratedThumbnail } from '@/shared/types/media'

import { ApiError } from './errors'
import { thumbnailDimensions } from './thumbnail-dimensions'

/** 原生元数据接口拒绝时，通过画布的图片解码器生成独立小图
 * @param originalSrc 本次下载的完整原图临时文件
 * @returns 画布导出的缩略图，保留完整原图用于查看
 */
const canvasThumbnail = (originalSrc: string): Promise<GeneratedThumbnail> =>
  new Promise((resolve, reject) => {
    const canvas = uni.createOffscreenCanvas({ type: '2d', width: 1, height: 1 })
    const image = canvas.createImage()
    image.onload = () => {
      try {
        const size = thumbnailDimensions(image.width, image.height)
        canvas.width = size.width
        canvas.height = size.height
        canvas.getContext('2d').drawImage(image, 0, 0, size.width, size.height)
        uni.canvasToTempFilePath({
          canvasId: '',
          canvas,
          width: size.width,
          height: size.height,
          destWidth: size.width,
          destHeight: size.height,
          fileType: 'jpg',
          quality: THUMBNAIL_QUALITY / 100,
          success: (result) => resolve({ thumbnailSrc: result.tempFilePath, originalSrc }),
          fail: () => reject(new Error('缩略图导出失败，可重试'))
        })
      } catch (reason) {
        reject(reason)
      }
    }
    image.onerror = () => reject(new Error('原图解码失败，可重试'))
    image.src = originalSrc
  })

/** 先下载到微信临时文件，再等比压缩，避免远程 getImageInfo 预处理阻断展示
 * @param url 当前账号已授权的完整原图地址
 * @returns 本地缩略图与完整原图的独立临时文件
 */
export const createNativeThumbnail = (url: string): Promise<GeneratedThumbnail> =>
  new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      timeout: 20000,
      success: (download) => {
        if (download.statusCode !== 200) {
          reject(
            new ApiError('thumbnail_download_failed', '原图下载失败，可重试', download.statusCode)
          )
          return
        }
        const originalSrc = download.tempFilePath
        uni.getImageInfo({
          src: originalSrc,
          success: (image) => {
            try {
              const size = thumbnailDimensions(image.width, image.height)
              uni.compressImage({
                src: originalSrc,
                quality: THUMBNAIL_QUALITY,
                compressedWidth: size.width,
                compressedHeight: size.height,
                success: (compressed) =>
                  resolve({ thumbnailSrc: compressed.tempFilePath, originalSrc }),
                fail: () => canvasThumbnail(originalSrc).then(resolve, reject)
              })
            } catch (reason) {
              reject(reason)
            }
          },
          fail: () => canvasThumbnail(originalSrc).then(resolve, reject)
        })
      },
      fail: () => reject(new Error('原图下载失败，可重试'))
    })
  })
