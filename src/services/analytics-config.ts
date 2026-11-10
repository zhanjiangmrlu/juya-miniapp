import type { AnalyticsConfig } from '../shared/types/analytics'

/** 仅显式配置的微信测试构建装载真实 SDK，生产默认不装载
 * @param mode 当前构建模式
 * @param platform 当前编译平台
 * @param env 现有私有环境配置，不读取或输出生产统计密钥
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
