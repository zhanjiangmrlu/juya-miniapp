import type { AnalyticsConfig } from '../shared/types/analytics'

/** 各环境均不装载不符合最小范围的真实 SDK
 * @param mode 当前构建模式
 * @param platform 当前编译平台
 * @param env 现有私有环境配置，不读取或输出生产统计密钥
 */
export const resolveAnalyticsConfig = (
  mode: string,
  platform: string,
  env: Record<string, string | undefined>
): AnalyticsConfig => {
  // SDK 2.8.0 含设备型号与自动会话，当前各环境固定关闭，不读取旧配置密钥
  void mode
  void platform
  void env
  return { enabled: false, appKey: '', environment: 'disabled' }
}
