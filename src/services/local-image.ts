/** 小程序本地联调图片先下载为临时文件，避免 image 组件直接加载 HTTP
 * @param url 已授权的图片地址，远程 HTTPS 和 H5 地址保持原样
 */
export const localImageSource = async (url: string): Promise<string> => {
  // #ifdef MP-WEIXIN
  if (import.meta.env.DEV && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) {
    return new Promise((resolve, reject) => {
      uni.downloadFile({
        url,
        timeout: 20000,
        success: (result) => {
          if (result.statusCode === 200) resolve(result.tempFilePath)
          else reject(new Error('图片下载失败，可重试'))
        },
        fail: () => reject(new Error('图片下载失败，可重试'))
      })
    })
  }
  // #endif
  return url
}
