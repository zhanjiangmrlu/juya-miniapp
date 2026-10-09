import type { LogSink, SensitiveKind } from '@/shared/types/logging'

export type { SensitiveKind } from '@/shared/types/logging'

/** 将敏感值完全替换，不保留可被关联的首尾字符。 */
export function redactSensitive(_value: string, _kind: SensitiveKind): string {
  return '[已脱敏]'
}

/** 递归复制日志参数，并对微信号字段进行完全脱敏。 */
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === 'wechat_id' || (key === 'value' && 'kind' in value && value.kind === 'wechat_id')
        ? '[已脱敏]'
        : sanitize(item)
    ])
  )
}

/** 创建安全日志包装器，确保调用方误传微信号时仍不会进入底层 logger 参数。 */
export function createSafeLogger(sink: LogSink): LogSink {
  return {
    info(message, ...arguments_) {
      sink.info(message, ...arguments_.map(sanitize))
    }
  }
}
