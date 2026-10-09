import { NetworkTransportError } from '@/services/http/errors'

import type { HttpTransport, TransportRequest, TransportResponse } from '@/shared/types/http'
export class UniTransport implements HttpTransport {
  /** 将 uni.request 回调接口适配为请求层使用的 Promise 传输协议。 */
  request<T>(request: TransportRequest): Promise<TransportResponse<T>> {
    return new Promise((resolve, reject) => {
      uni.request({
        data: request.body as UniApp.RequestOptions['data'],
        fail: () => reject(new NetworkTransportError()),
        header: request.headers,
        method: request.method,
        success: (response) =>
          resolve({
            data: response.data as T,
            headers: response.header as Record<string, string>,
            status: response.statusCode
          }),
        timeout: request.timeout,
        url: request.url
      })
    })
  }
}
