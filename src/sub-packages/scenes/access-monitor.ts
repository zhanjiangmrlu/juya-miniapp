import { MAX_ACCESS_TIMER_MS } from '@/shared/constants/learning-access'

import type { components } from '@/shared/contracts/generated/mini-api'

/** 刷新当前页面权限并按服务端相对到期时间重验
 * @param request 当前用户和页面绑定的权限请求
 * @param apply 只接收最新一代请求的权限结果
 * @param failed 权限未知时阻止受控操作并保留恢复入口
 */
export const createAccessMonitor = <
  T extends { access: components['schemas']['LearningPermission'] }
>(
  request: () => Promise<T>,
  apply: (value: T) => void,
  failed: (reason: unknown) => void
) => {
  let generation = 0,
    alive = true,
    pending: Promise<boolean> | null = null,
    timer: ReturnType<typeof setTimeout> | undefined
  /** 隐藏或重新读取时取消到期任务和旧响应 */
  const suspend = () => {
    generation++
    pending = null
    clearTimeout(timer)
    timer = undefined
  }
  /** 仅以服务端结果授权，不把失败或迟到响应当作有效权限 */
  const read = async () => {
    if (!alive) return false
    suspend()
    const run = generation
    try {
      const value = await request()
      if (!alive || run !== generation) return false
      apply(value)
      const delay = value.access.expires_at
        ? Date.parse(value.access.expires_at) - Date.parse(value.access.server_now)
        : 0
      if (delay > 0)
        timer = setTimeout(
          () => {
            void refresh()
          },
          Math.min(delay, MAX_ACCESS_TIMER_MS)
        )
      return value.access.can_learn
    } catch (reason) {
      if (alive && run === generation) failed(reason)
      return false
    }
  }
  /** 同一可见页面共享在途核对，避免onLoad与onShow互相取消 */
  const refresh = (): Promise<boolean> => {
    if (pending) return pending
    const job = read().finally(() => {
      if (pending === job) pending = null
    })
    pending = job
    return job
  }
  /** 页面销毁后拒绝所有后续响应与回调 */
  const dispose = () => {
    alive = false
    suspend()
  }
  return { refresh, suspend, dispose }
}
