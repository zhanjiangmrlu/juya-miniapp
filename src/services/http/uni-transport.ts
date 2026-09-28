import {
  type HttpTransport,
  NetworkTransportError,
  type TransportRequest,
  type TransportResponse
} from './types'
export class UniTransport implements HttpTransport {
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
