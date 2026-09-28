import { ApiError, isApiErrorPayload } from './types'
const USER_MESSAGES: Record<string, string> = {
  FEEDBACK_CONTENT_BLOCKED: '反馈内容未通过安全检查，请修改后重试',
  RATE_LIMITED: '操作过于频繁，请稍后再试',
  SESSION_EXPIRED: '登录状态已失效，正在重新连接',
  SIGNED_MEDIA_EXPIRED: '音频地址已过期，请重新加载'
}

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
