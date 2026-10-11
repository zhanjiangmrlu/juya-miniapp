import { ApiError, NetworkTransportError } from '@/services/http/errors'
import { HttpMethod } from '@/shared/enums/http'

import type { HttpTransport, TransportRequest, TransportResponse } from '@/shared/types/http'
export class UniTransport implements HttpTransport {
  /** 将 uni.request 回调接口适配为请求层使用的 Promise 传输协议。 */
  request<T>(request: TransportRequest): Promise<TransportResponse<T>> {
    return new Promise((resolve, reject) => {
      // 微信官方method清单不含PATCH，本人资料统一使用已发布POST端点
      if (
        request.method === HttpMethod.PATCH &&
        uni.getSystemInfoSync().uniPlatform === 'mp-weixin'
      ) {
        reject(
          new ApiError('PROFILE_UPDATE_METHOD_UNAVAILABLE', '资料保存暂不可用，请稍后重试', 503)
        )
        return
      }
      const options = {
        data: request.body as UniApp.RequestOptions['data'],
        fail: () => reject(new NetworkTransportError()),
        header: request.headers,
        method: request.method,
        success: (response: UniApp.RequestSuccessCallbackResult) =>
          resolve({
            data: response.data as T,
            headers: response.header as Record<string, string>,
            status: response.statusCode
          }),
        timeout: request.timeout,
        url: request.url
      }
      // 已安装H5运行时支持PATCH，但旧跨端类型未声明；微信已在上方拒绝不支持的方法
      uni.request(options as UniApp.RequestOptions)
    })
  }
}
