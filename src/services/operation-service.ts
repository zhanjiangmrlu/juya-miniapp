import { OPERATIONS_STORAGE_PREFIX } from '@/shared/constants/http'

import type { OperationPorts, OperationRecord } from '@/shared/types/operations'

import { ApiError, isUnconfirmedFailure } from './errors'

/** 保存固定操作标识并支持结果查询，个人提交正文仅留内存
 * @param ports 当前本人会话、元数据存储与随机操作键
 */
export const createOperationService = (ports: OperationPorts) => {
  const fingerprints = new Map<string, string>(),
    receiptMisses = new Map<string, string>()
  /** 识别已退役的联系方式写入，兼容历史动作名及路径
   * @param action 本地保存的页面动作名称
   * @param path 本地保存的本人接口路径
   */
  const retiredContact = (action: string, path = '') =>
    action === 'contact-save' ||
    action === 'contact' ||
    /^\/api\/mini\/v1\/me\/contact(?:[/?#]|$)/.test(path)
  /** 拒绝重新提交已退役联系方式，不读取或保存正文
   * @param action 本次请求的页面动作名称
   * @param path 本次请求的本人接口路径
   */
  const assertActive = (action: string, path = '') => {
    if (retiredContact(action, path))
      throw new ApiError('contact_collection_retired', '联系方式填写已取消，请返回账号页')
  }
  /** 通知非阻塞观察者，统计失败不改变业务成功结果
   * @param record 当前身份已确认的原业务操作
   */
  const notifyConfirmed = (record: OperationRecord) => {
    try {
      ports.onConfirmed?.(record)
    } catch {
      /* 观察者异常不能导致业务操作重试 */
    }
  }
  /** 取得当前账号范围及待确认元数据，不能读取其他账号结果 */
  const context = () => {
    const userId = ports.session.userId()
    if (!userId) throw new ApiError('unauthenticated', '请先登录')
    const key = OPERATIONS_STORAGE_PREFIX + userId
    const stored = ports.storage.get(key)
    const previous = Array.isArray(stored) ? (stored as OperationRecord[]) : []
    const records = previous.filter((row) => !retiredContact(row.action, row.path))
    if (records.length !== previous.length) {
      ports.storage.set(key, records)
      for (const row of previous) {
        if (!retiredContact(row.action, row.path)) continue
        fingerprints.delete(`${userId}:${row.action}`)
        receiptMisses.delete(`${userId}:${row.action}`)
      }
    }
    return {
      userId,
      identity: ports.session.identity?.() || userId,
      key,
      records
    }
  }
  /** 确认返回仍属于发起操作的会话代次，同账号重登也不复用旧响应
   * @param state 操作发出时捕获的账号与会话边界
   */
  const current = (state: ReturnType<typeof context>) =>
    ports.session.userId() === state.userId &&
    (ports.session.identity?.() || state.userId) === state.identity
  /** 只清理仍属于该原键的记录，同一回执仅首次消费时通知
   * @param record 已确认成功或确定失败的原操作
   * @param owner 发起操作的账号上下文
   */
  const forget = (record: OperationRecord, owner: ReturnType<typeof context>) => {
    const stored = ports.storage.get(owner.key)
    const records = Array.isArray(stored) ? (stored as OperationRecord[]) : []
    const remaining = records.filter(
      (row) => row.key !== record.key || row.action !== record.action
    )
    if (remaining.length === records.length) return false
    ports.storage.set(owner.key, remaining)
    fingerprints.delete(`${owner.userId}:${record.action}`)
    receiptMisses.delete(`${owner.userId}:${record.action}`)
    return true
  }
  /** 重填事务的原请求仍未知时，任何后续正文失败都不能清除原键
   * @param owner 原请求所属账号的元数据位置
   * @param record 本次请求所用的固定操作记录
   */
  const retainsUnknown = (owner: ReturnType<typeof context>, record: OperationRecord) => {
    const stored = ports.storage.get(owner.key)
    const records = Array.isArray(stored) ? (stored as OperationRecord[]) : []
    return (
      record.originalUnknown === true ||
      records.some(
        (row) =>
          row.action === record.action && row.key === record.key && row.originalUnknown === true
      )
    )
  }
  /** 先查询回执，未找到时用冻结的原正文和原键重试
   * @param action 本人待确认行为
   * @param options 是否允许在回执未找到时重试原请求，重新登录后仅查询时关闭
   */
  const recover = async <T>(
    action: string,
    options: { retry?: boolean } = {}
  ): Promise<T | null> => {
    const state = context(),
      record = state.records.find((row) => row.action === action)
    if (!record) return null
    const scope = `${state.userId}:${action}`
    receiptMisses.delete(scope)
    let result: T
    try {
      const value = await ports.session.request<{ status: 'succeeded'; result: T }>(
        `/api/mini/v1/operations/${encodeURIComponent(record.key)}`
      )
      result = value.result
    } catch (reason) {
      if (!(reason instanceof ApiError) || reason.code !== 'operation_unknown') throw reason
      if (!current(state)) throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
      if (!context().records.some((row) => row.action === action && row.key === record.key))
        return null
      receiptMisses.set(scope, record.key)
      if (options.retry === false) throw reason
      const frozen = record.frozenRequest || fingerprints.get(scope)
      if (!frozen) {
        // 旧版没有持久保存完成版本，显式查无回执后只能回到当前列表重新学习
        if (action.startsWith('complete:') && reason.status === 404) {
          forget(record, state)
          throw new ApiError(
            'completion_version_missing',
            '上次完成未查到回执且缺少原版本，请重新打开卡片核对学习状态'
          )
        }
        throw reason
      }
      receiptMisses.delete(scope)
      try {
        result = await ports.session.request<T>(record.path, {
          method: record.method,
          body: JSON.parse(frozen).body,
          key: record.key
        })
      } catch (retryError) {
        if (
          retryError instanceof ApiError &&
          !isUnconfirmedFailure(retryError) &&
          retryError.code !== 'browse_only' &&
          !retainsUnknown(state, record)
        )
          forget(record, state)
        throw retryError
      }
    }
    if (!current(state)) throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
    if (forget(record, state)) notifyConfirmed(record)
    return result
  }
  /** 同一次保存或学习操作始终复用同一键，未知结果前禁止改换正文
   * @param action 当前页面动作的唯一业务名称
   * @param path 实际本人接口路径
   * @param method 写方法
   * @param body 固定提交正文
   * @param options 是否持久保留已核对不含个人输入的固定请求
   */
  const run = async <T>(
    action: string,
    path: string,
    method: string,
    body?: unknown,
    options: { persistBody?: boolean } = {}
  ): Promise<T> => {
    const state = context()
    assertActive(action, path)
    const scope = `${state.userId}:${action}`,
      fingerprint = JSON.stringify({ path, method, body })
    let record = state.records.find((row) => row.action === action)
    // 本次未发出不代表先前未知事务未提交，旧记录被平台模式阻止时必须保留原键
    const wasPending = Boolean(record)
    if (
      record &&
      (record.path !== path ||
        record.method !== method ||
        ((fingerprints.get(scope) || record.frozenRequest) &&
          (fingerprints.get(scope) || record.frozenRequest) !== fingerprint))
    )
      throw new ApiError('operation_pending', '请先查询或重试上次操作，再提交新的修改')
    if (!record) {
      record = {
        action,
        path,
        method,
        key: ports.key(),
        ...(options.persistBody ? { frozenRequest: fingerprint } : {})
      }
      state.records.push(record)
      ports.storage.set(state.key, state.records)
    }
    fingerprints.set(scope, fingerprint)
    receiptMisses.delete(scope)
    try {
      const result = await ports.session.request<T>(path, { method, body, key: record.key })
      if (!current(state)) throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
      if (forget(record, state)) notifyConfirmed(record)
      return result
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        !isUnconfirmedFailure(reason) &&
        !(wasPending && reason.code === 'browse_only') &&
        !retainsUnknown(state, record)
      )
        forget(record, state)
      throw reason
    }
  }
  /** 丢失原文后仅在该账号和该键刚查无回执时重新填写，原路径、方法与键保持不变
   * @param action 已查询为未知的本人操作
   * @param body 用户明确重新填写并确认的正文
   */
  const rebind = async <T>(action: string, body: unknown): Promise<T> => {
    const state = context()
    assertActive(action)
    const scope = `${state.userId}:${action}`,
      record = state.records.find((row) => row.action === action)
    if (!record || receiptMisses.get(scope) !== record.key)
      throw new ApiError('operation_pending', '请先查询原提交结果，再确认重新填写')
    record.originalUnknown = true
    ports.storage.set(state.key, state.records)
    fingerprints.delete(scope)
    receiptMisses.delete(scope)
    return run<T>(action, record.path, record.method, body)
  }
  /** 判断当前动作是否仍有待确认的服务端结果
   * @param action 页面动作
   */
  const pending = (action: string) => context().records.some((row) => row.action === action)
  /** 仅枚举当前账号指定业务的待确认动作，不暴露操作键或提交正文
   * @param prefix 本次恢复需要的业务动作前缀
   */
  const pendingActions = (prefix: string) =>
    context()
      .records.filter((row) => row.action.startsWith(prefix))
      .map((row) => row.action)
  /** 退出账号时立即释放含个人输入的内存 */
  const clearMemory = () => {
    fingerprints.clear()
    receiptMisses.clear()
  }
  if (ports.session.userId()) context()
  return { run, recover, rebind, pending, pendingActions, clearMemory }
}
