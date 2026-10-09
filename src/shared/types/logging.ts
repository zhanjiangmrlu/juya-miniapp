export type SensitiveKind = 'wechat_id'

export interface LogSink {
  info(message: string, ...arguments_: unknown[]): void
}
