import type { AnalyticsConfig } from '../shared/types/analytics'

/** CHG-0040 能力交付阶段所有实际构建关闭真实传输，私有旧配置不能绕过
 * @param _mode 当前构建模式
 * @param _platform 当前编译平台
 * @param _env 构建环境变量，当前阶段不读取统计密钥
 */
export const resolveAnalyticsConfig = (
  _mode: string,
  _platform: string,
  _env: Record<string, string | undefined>
): AnalyticsConfig => ({ enabled: false, appKey: '', environment: 'disabled' })
