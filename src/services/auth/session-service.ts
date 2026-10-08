import type { HttpClient } from '@/services/http/client'
import type {
  RefreshSessionRequest,
  SessionResponse,
  WechatSessionRequest
} from '@/shared/contracts/session'
export interface SessionService {
  loginWithWechat(code: string): Promise<SessionResponse>
  refresh(refreshToken: string): Promise<SessionResponse>
}

/** 获取登录设备的平台、机型和系统描述，限制为接口允许的 200 字符 */
const describeDevice = (): string => {
  try {
    const info = uni.getDeviceInfo?.()
    return (
      [info?.platform, info?.model, info?.system]
        .filter(Boolean)
        .join(' / ')
        .trim()
        .slice(0, 200) || 'unknown-device'
    )
  } catch {
    return 'unknown-device'
  }
}

/** 创建会话服务，client 为登录与刷新使用的请求客户端，两者均不携带旧令牌 */
export const createSessionService = (client: HttpClient): SessionService => {
  return {
    /** 提交微信临时代码与设备描述，code 为微信 SDK 本次返回的一次性凭证 */
    loginWithWechat: (code) =>
      client.post(
        '/api/v1/session/wechat',
        { code, device: describeDevice() } satisfies WechatSessionRequest,
        {
          auth: false
        }
      ),
    /** 轮换登录会话，refreshToken 为本机保存的刷新凭证 */
    refresh: (refreshToken) =>
      client.post(
        '/api/v1/session/refresh',
        { refresh_token: refreshToken } satisfies RefreshSessionRequest,
        { auth: false }
      )
  }
}
