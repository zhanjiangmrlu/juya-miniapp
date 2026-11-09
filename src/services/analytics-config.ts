import type { AnalyticsConfig } from '../shared/types/analytics'

/** 微信测试与生产构建各自读取专用 AppKey，其他模式保持关闭
 * @param mode Vite 构建模式
 * @param platform uni-app 目标平台
 * @param env 当前构建读取的私有环境配置
 */
export const resolveAnalyticsConfig = (
  mode: string,
  platform: string,
  env: Record<string, string | undefined>
): AnalyticsConfig => {
  const environment = mode === 'test' || mode === 'production' ? mode : 'disabled'
  const appKey =
    (environment === 'test'
      ? env.VITE_UMENG_TEST_APP_KEY
      : environment === 'production'
        ? env.VITE_UMENG_PROD_APP_KEY
        : ''
    )?.trim() || ''
  const enabled =
    environment !== 'disabled' &&
    platform === 'mp-weixin' &&
    env.VITE_UMENG_ENABLED === 'true' &&
    !!appKey
  return { enabled, appKey: enabled ? appKey : '', environment: enabled ? environment : 'disabled' }
}
