import { OPERATIONS_STORAGE_PREFIX } from '@/shared/constants/http'

import type { OperationPorts, OperationRecord } from '@/shared/types/operations'

import { ApiError, isUnconfirmedFailure } from './errors'

/** 保存固定操作标识并支持结果查询，个人提交正文仅留内存
 * @param ports 当前本人会话、元数据存储与随机操作键
 */
export const createOperationService = (ports: OperationPorts) => {
  const fingerprints = new Map<string, string>()
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
  }
  /** 先查询回执，未找到时用内存中的原正文和原键重试，不替换为页面新输入
   * @param action 本人待确认行为
   */
  const recover = async <T>(action: string): Promise<T | null> => {
    const state = context(),
      record = state.records.find((row) => row.action === action)
    if (!record) return null
    let result: T
    try {
      const value = await ports.session.request<{ status: 'succeeded'; result: T }>(
        `/api/mini/v1/operations/${encodeURIComponent(record.key)}`
      )
      result = value.result
    } catch (reason) {
      const frozen = fingerprints.get(`${state.userId}:${action}`)
      if (!(reason instanceof ApiError) || reason.code !== 'operation_unknown' || !frozen)
        throw reason
      if (ports.session.userId() !== state.userId)
        throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
      try {
        result = await ports.session.request<T>(record.path, {
          method: record.method,
          body: JSON.parse(frozen).body,
          key: record.key
        })
      } catch (retryError) {
        if (retryError instanceof ApiError && !isUnconfirmedFailure(retryError))
          forget(action, state)
        throw retryError
      }
    }
    forget(action, state)
    if (ports.session.userId() !== state.userId)
      throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
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
    try {
      const result = await ports.session.request<T>(path, { method, body, key: record.key })
      forget(action, state)
      if (ports.session.userId() !== state.userId)
        throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
      return result
    } catch (reason) {
      if (reason instanceof ApiError && !isUnconfirmedFailure(reason)) forget(action, state)
      throw reason
    }
  }
  /** 判断当前动作是否仍有待确认的服务端结果
   * @param action 页面动作
   */
  const pending = (action: string) => context().records.some((row) => row.action === action)
  /** 退出账号时立即释放含个人输入的内存 */
  const clearMemory = () => fingerprints.clear()
  return { run, recover, pending, clearMemory }
}
