import { ApiError, isApiErrorPayload } from '@/services/http/errors'
import { API_USER_MESSAGES as USER_MESSAGES } from '@/shared/constants/http'

/** 统一接口错误，status为HTTP状态，payload为响应体，responseRequestId为响应头关联标识 */
export const mapApiError = (
  status: number,
  payload: unknown,
  responseRequestId?: string
): ApiError => {
  if (isApiErrorPayload(payload)) {
    return new ApiError(
      payload.code,
      Object.prototype.hasOwnProperty.call(USER_MESSAGES, payload.code)
        ? USER_MESSAGES[payload.code]
        : payload.message,
      status,
      payload.details,
      payload.request_id ?? responseRequestId
    )
  }
  return new ApiError(
    'REQUEST_FAILED',
    '请求未完成，请稍后重试',
    status,
    undefined,
    responseRequestId
  )
}
