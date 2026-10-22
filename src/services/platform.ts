import type { HttpRequest, HttpResponse, StoragePort } from '@/shared/types/runtime'

export const storage: StoragePort = {
  get: (key) => uni.getStorageSync(key),
  set: (key, value) => uni.setStorageSync(key, value),
  remove: (key) => uni.removeStorageSync(key)
}
export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** 创建一次客户端操作标识，不用它承担账号身份认证 */
export const operationKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

/** 解析服务器受控资源地址，不向任意外部来源传递凭证
 * @param path 服务器返回的相对私有资源路径
 */
export const resourceURL = (path: string) => {
  if (!path.startsWith('/api/mini/v1/')) throw new Error('资源地址暂不可用')
  return apiBase + path
}

/** 通过微信小程序能力取得临时code，只允许主动点击后调用 */
export const wechatLogin = (): Promise<string> =>
  new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.login({
      provider: 'weixin',
      success: (result) => resolve(result.code),
      fail: () => reject(new Error('微信登录暂未成功'))
    })
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error('请在微信小程序内登录'))
    // #endif
  })

/** 使用平台HTTP边界，上传头像也通过同一业务Token和错误处理
 * @param request 仅包含小程序业务路径与明确请求数据
 */
export const sendRequest = (request: HttpRequest): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const upload = request.body as
      { file_path?: string; progress?: (value: number) => void } | undefined
    if (
      ['/api/mini/v1/me/avatar', '/api/mini/v1/feedback/images'].includes(request.path) &&
      request.method === 'POST' &&
      upload?.file_path
    ) {
      const task = uni.uploadFile({
        url: apiBase + request.path,
        filePath: upload.file_path,
        name: 'file',
        header: request.headers,
        timeout: 120000,
        success: (result) => {
          let value: unknown = null
          try {
            value = JSON.parse(result.data)
          } catch {
            /* The session layer rejects an unconfirmed response */
          }
          resolve({ status: result.statusCode, data: value })
        },
        fail: () => reject(new Error('上传响应未知'))
      })
      task.onProgressUpdate((event) => upload.progress?.(event.progress))
      return
    }
    uni.request({
      url: apiBase + request.path,
      method: request.method as UniApp.RequestOptions['method'],
      header: { 'Content-Type': 'application/json', ...request.headers },
      data: request.body as UniApp.RequestOptions['data'],
      timeout: 20000,
      success: (result) => resolve({ status: result.statusCode, data: result.data }),
      fail: () => reject(new Error('网络响应未知'))
    })
  })
