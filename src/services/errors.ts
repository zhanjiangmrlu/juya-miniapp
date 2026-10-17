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
  (['network_unknown', 'response_unknown', 'operation_pending', 'operation_conflict'].includes(
    reason.code
  ) ||
    reason.status >= 500 ||
    reason.status === 408 ||
    reason.status === 429)
