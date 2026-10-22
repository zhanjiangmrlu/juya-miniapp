import { OPERATIONS_STORAGE_PREFIX } from '@/shared/constants/http'

import type { OperationPorts, OperationRecord } from '@/shared/types/operations'

import { ApiError, isUnconfirmedFailure } from './errors'

/** 保存固定操作标识并支持结果查询，个人提交正文仅留内存
 * @param ports 当前本人会话、元数据存储与随机操作键
 */
export const createOperationService = (ports: OperationPorts) => {
  const fingerprints = new Map<string, string>(),
    receiptMisses = new Map<string, string>()
  /** 取得当前账号范围及待确认元数据，不能读取其他账号结果 */
  const context = () => {
    const userId = ports.session.userId()
    if (!userId) throw new ApiError('unauthenticated', '请先登录')
    const key = OPERATIONS_STORAGE_PREFIX + userId
    const stored = ports.storage.get(key)
    return { userId, key, records: Array.isArray(stored) ? (stored as OperationRecord[]) : [] }
  }
  /** 成功或确定失败后清理一项待确认记录
   * @param action 页面行为标识
   * @param owner 发起操作的账号上下文
   */
  const forget = (action: string, owner: ReturnType<typeof context>) => {
    const stored = ports.storage.get(owner.key)
    const records = Array.isArray(stored) ? (stored as OperationRecord[]) : []
    ports.storage.set(
      owner.key,
      records.filter((row) => row.action !== action)
    )
    fingerprints.delete(`${owner.userId}:${action}`)
    receiptMisses.delete(`${owner.userId}:${action}`)
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
  /** 先查询回执，未找到时用内存中的原正文和原键重试，不替换为页面新输入
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
      if (
        reason instanceof ApiError &&
        reason.code === 'operation_unknown' &&
        ports.session.userId() === state.userId
      )
        receiptMisses.set(scope, record.key)
      const frozen = fingerprints.get(`${state.userId}:${action}`)
      if (
        options.retry === false ||
        !(reason instanceof ApiError) ||
        reason.code !== 'operation_unknown' ||
        !frozen
      )
        throw reason
      if (ports.session.userId() !== state.userId)
        throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
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
          !retainsUnknown(state, record)
        )
          forget(action, state)
        throw retryError
      }
    }
    if (ports.session.userId() !== state.userId)
      throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
    forget(action, state)
    return result
  }
  /** 同一次保存或学习操作始终复用同一键，未知结果前禁止改换正文
   * @param action 当前页面动作的唯一业务名称
   * @param path 实际本人接口路径
   * @param method 写方法
   * @param body 固定提交正文
   */
  const run = async <T>(
    action: string,
    path: string,
    method: string,
    body?: unknown
  ): Promise<T> => {
    const state = context(),
      scope = `${state.userId}:${action}`,
      fingerprint = JSON.stringify({ path, method, body })
    let record = state.records.find((row) => row.action === action)
    if (
      record &&
      (record.path !== path ||
        record.method !== method ||
        (fingerprints.has(scope) && fingerprints.get(scope) !== fingerprint))
    )
      throw new ApiError('operation_pending', '请先查询或重试上次操作，再提交新的修改')
    if (!record) {
      record = { action, path, method, key: ports.key() }
      state.records.push(record)
      ports.storage.set(state.key, state.records)
    }
    fingerprints.set(scope, fingerprint)
    receiptMisses.delete(scope)
    try {
      const result = await ports.session.request<T>(path, { method, body, key: record.key })
      if (ports.session.userId() !== state.userId)
        throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
      forget(action, state)
      return result
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        !isUnconfirmedFailure(reason) &&
        !retainsUnknown(state, record)
      )
        forget(action, state)
      throw reason
    }
  }
  /** 丢失原文后仅在该账号和该键刚查无回执时重新填写，原路径、方法与键保持不变
   * @param action 已查询为未知的本人操作
   * @param body 用户明确重新填写并确认的正文
   */
  const rebind = async <T>(action: string, body: unknown): Promise<T> => {
    const state = context(),
      scope = `${state.userId}:${action}`,
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
  /** 退出账号时立即释放含个人输入的内存 */
  const clearMemory = () => {
    fingerprints.clear()
    receiptMisses.clear()
  }
  return { run, recover, rebind, pending, clearMemory }
}
