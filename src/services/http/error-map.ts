import { ApiError, isApiErrorPayload } from '@/services/http/errors'
import { API_USER_MESSAGES as USER_MESSAGES } from '@/shared/constants/http'

/** 将接口错误结构转换为可展示的统一业务异常，未知响应使用安全兜底文案。 */
export function mapApiError(status: number, payload: unknown): ApiError {
  if (isApiErrorPayload(payload)) {
    return new ApiError(
      payload.code,
      USER_MESSAGES[payload.code] ?? payload.message,
      status,
      payload.details
    )
  }
  return new ApiError('REQUEST_FAILED', '请求未完成，请稍后重试', status)
}
