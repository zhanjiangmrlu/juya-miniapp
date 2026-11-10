import type { LoginSnapshot } from '@/shared/types/navigation'

/** 保存一次主动登录的内存来源，不包含账号凭据或待执行写操作 */
export const createLoginReturn = () => {
  let source: { page: string; capture: () => LoginSnapshot; resume?: () => void } | null = null,
    snapshot: LoginSnapshot | null = null,
    returnTarget = '/pages/home/index',
    ready = false,
    navigating = false
  /** 注册当前可见页的来源采样，capture 在登录清理身份前执行
   * @param page 当前页面的白名单路径
   * @param capture 当前内存阅读状态采样器
   * @param resume 原生入栈失败后在来源页重新加载展示的回调
   */
  const register = (page: string, capture: () => LoginSnapshot, resume?: () => void) => {
    const current = { page, capture, resume }
    source = current
    return () => {
      if (source === current) source = null
    }
  }
  /** 冻结来源，后续取消或失败不触发任何动作
   * @param target 已经通过导航白名单校验的目标
   */
  const begin = (target: string) => {
    navigating = true
    returnTarget = target
    snapshot = source?.page === target.split('?')[0] ? { ...source.capture() } : null
    ready = false
  }
  /** 登录确认成功后仅允许来源页单次读取快照 */
  const succeed = () => {
    ready = true
    navigating = false
  }
  /** 退出或取消时丢弃尚未消费的来源 */
  const cancel = () => {
    snapshot = null
    ready = false
    navigating = false
    returnTarget = '/pages/home/index'
  }
  /** 取消登录只恢复游客阅读展示，仍需重新检查当前发布内容
   * @param notify 原生入栈失败且来源页仍可见时立即通知恢复
   */
  const resumeGuest = (notify = false) => {
    ready = true
    navigating = false
    if (notify) source?.resume?.()
  }
  /** 进入登录期间禁止后台界面自行重建阅读或播放器 */
  const pending = () => navigating
  /** 当前目标仅用于无原生来源栈时的安全回退 */
  const target = () => returnTarget
  /** 消费属于当前页面和稳定内容的成功登录快照
   * @param page 恢复页面路径
   * @param id 当前稳定内容编号，普通页面为空
   */
  const take = (page: string, id = '') => {
    if (!ready || snapshot?.page !== page || snapshot.id !== id) return null
    const value = snapshot
    snapshot = null
    ready = false
    return value
  }
  /** 查看协议时冻结当前阅读，不包含待执行动作 */
  const pauseForReading = () => {
    if (source) begin(source.page)
  }
  return { pauseForReading, register, begin, succeed, cancel, resumeGuest, pending, target, take }
}
export const loginReturn = createLoginReturn()
