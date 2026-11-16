import type { AnalyticsConfig } from '../shared/types/analytics'

/** 只为显式配置的微信测试构建装载受控 SDK
 * @param mode 当前构建模式
 * @param platform 当前编译平台
 * @param env 当前构建的私有配置，只读取测试统计标识
 */
export const resolveAnalyticsConfig = (
  mode: string,
  platform: string,
  env: Record<string, string | undefined>
): AnalyticsConfig => {
  const appKey = env.VITE_UMENG_TEST_APP_KEY?.trim() || ''
  if (mode === 'test' && platform === 'mp-weixin' && env.VITE_UMENG_ENABLED === 'true' && appKey)
    return { enabled: true, appKey, environment: 'test' }
  return { enabled: false, appKey: '', environment: 'disabled' }
}
