/** HTTP错误保留安全文案，响应未知时不得提前显示成功 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public details: { field?: string; message?: string }[] = []
  ) {
    super(message)
  }
}

/** 判断服务端是否可能已经提交，重试必须保留原操作标识
 * @param reason 网络、网关或业务返回的安全错误
 */
export const isUnconfirmedFailure = (reason: unknown) =>
  reason instanceof ApiError &&
  ([
    'network_unknown',
    'response_unknown',
    'operation_pending',
    'operation_conflict',
    'session_changed'
  ].includes(reason.code) ||
    reason.status >= 500 ||
    reason.status === 408 ||
    reason.status === 429)

/** 只恢复已知临时错误或本地文件错误，权限与永久合成失败不自动循环
 * @param reason 本次准备或原生播放的错误
 * @param localSource 当前是否使用下载后的本地文件
 */
export const wordAudioRecovery = (reason: unknown, localSource: boolean) => {
  if (reason instanceof ApiError) {
    if (reason.code === 'word_audio_format_invalid') return 'file'
    if (reason.code === 'speech_grant_expired' || reason.code === 'speech_grant_invalid')
      return 'temporary'
    if (
      ['network_unknown', 'word_audio_network'].includes(reason.code) ||
      reason.status === 408 ||
      reason.status >= 500
    )
      return 'temporary'
    return null
  }
  const code = Number((reason as { errCode?: unknown } | undefined)?.errCode)
  if (code === 10002) return 'temporary'
  if (localSource && [10003, 10004].includes(code)) return 'file'
  return null
}
