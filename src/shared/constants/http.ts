export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8001'

export const API_USER_MESSAGES: Record<string, string> = {
  FEEDBACK_CONTENT_BLOCKED: '反馈内容未通过安全检查，请修改后重试',
  RATE_LIMITED: '操作过于频繁，请稍后再试',
  SESSION_EXPIRED: '登录状态已失效，正在重新连接',
  SIGNED_MEDIA_EXPIRED: '音频地址已过期，请重新加载'
}
export const HTTP_REQUEST_TIMEOUT_MS = 10_000
