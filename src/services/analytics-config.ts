import type { AnalyticsConfig } from '../shared/types/analytics'

/** 只为显式配置的微信测试或生产构建装载受控 SDK
 * @param mode 当前构建模式
 * @param platform 当前编译平台
 * @param env 当前构建的私有配置，按环境读取独立统计标识
 */
export const resolveAnalyticsConfig = (
  mode: string,
  platform: string,
  env: Record<string, string | undefined>
): AnalyticsConfig => {
  const appKey =
    (mode === 'production' ? env.VITE_UMENG_PROD_APP_KEY : env.VITE_UMENG_TEST_APP_KEY)?.trim() ||
    ''
  if (
    (mode === 'test' || mode === 'production') &&
    platform === 'mp-weixin' &&
    env.VITE_UMENG_ENABLED === 'true' &&
    appKey
  )
    return { enabled: true, appKey, environment: mode }
  return { enabled: false, appKey: '', environment: 'disabled' }
}
