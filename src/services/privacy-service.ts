import { ref } from 'vue'

import { PRIVACY_STORAGE_PREFIX } from '@/shared/constants/privacy'

import type {
  AgreementConfirmation,
  PolicyBundle,
  PrivacyPorts,
  PrivacyState
} from '@/shared/types/privacy'

/** 管理协议确认与按账号隔离的撤回记录，统计许可不代表实际采集
 * @param ports 匿名协议读取、本人请求与私有存储端口
 */
export const createPrivacyService = (ports: PrivacyPorts) => {
  const policies = ref<PolicyBundle>({ mode: 'legacy', server_now: '', documents: [] }),
    state = ref<PrivacyState | null>(null)
  let owner = '',
    generation = 0
  const prefix = PRIVACY_STORAGE_PREFIX + (ports.namespace || 'test') + ':'
  const now = ports.now || Date.now
  /** 读取当前显示文档的版本，不生成占位版本
   * @param kind 当前协议用途
   */
  const version = (kind: string) =>
    policies.value.documents.find((d) => d.kind === kind)?.version || ''
  /** 判断正式必需协议是否完整 */
  const published = () =>
    policies.value.mode === 'published' &&
    ['terms', 'privacy'].every((kind) =>
      policies.value.documents.some((d) => d.kind === kind && !!d.version && !!d.content.trim())
    )
  /** 计算北京时间自然日，不依赖宿主时区 */
  const day = () => new Date(now() + 8 * 3600000).toISOString().slice(0, 10)
  /** 读取当前版本明确确认，旧设备统计选择不参与 */
  const confirmation = () => {
    const value = ports.storage.get(prefix + 'agreement') as AgreementConfirmation | undefined
    return published() &&
      value?.terms_version === version('terms') &&
      value?.privacy_version === version('privacy')
      ? value
      : undefined
  }
  /** 返回当前两份协议是否明确确认 */
  const confirmed = () => !!confirmation() || state.value?.agreements.current === true
  /** 判断启动时待展示告知，不在普通页面操作中调用 */
  const shouldNotify = () =>
    published() && !confirmed() && ports.storage.get(prefix + 'shown') !== day()
  /** 仅实际展示时消耗自动告知次数 */
  const markShown = () => ports.storage.set(prefix + 'shown', day())
  /** 在微信登录前独立持久保存明确确认
   * @param source 本次明确确认的界面来源
   */
  const confirm = (source: string): AgreementConfirmation => {
    if (!published()) throw new Error('正式协议尚未配置')
    const value = {
      confirmation_id: ports.key(),
      terms_version: version('terms'),
      privacy_version: version('privacy'),
      client_confirmed_at: new Date(now()).toISOString(),
      source
    }
    ports.storage.set(prefix + 'agreement', value)
    return value
  }
  /** 匿名加载真实政策，失败不伪造发布状态 */
  const loadPolicies = async () => {
    policies.value = await ports.policies()
    return policies.value
  }
  /** 判断当前账号是否存在尚未同步的关闭记录 */
  const isBlocked = () => !!owner && ports.storage.get(prefix + 'off:' + owner) === true
  /** 核对当前稳定账号，不让旧请求覆盖新账号
   * @param userId 已由业务服务端确认的账号编号
   */
  const restore = async (userId: string) => {
    if (owner !== userId) {
      generation++
      state.value = null
      owner = userId
    }
    const run = generation
    const result = await ports.request<PrivacyState>('/api/mini/v1/me/privacy')
    if (run !== generation) return
    state.value = isBlocked()
      ? { ...result, analytics: { ...result.analytics, enabled: false, collecting: false } }
      : result
  }
  /** 立即本地关闭后再同步服务端，失败保持关闭
   * @param enabled 本次明确统计选择
   */
  const choose = async (enabled: boolean) => {
    if (!owner || !state.value) throw new Error('请先登录并核对账号')
    const user = owner,
      key = prefix + 'off:' + owner,
      pendingKey = prefix + 'preference:' + owner
    if (enabled && isBlocked()) await choose(false)
    const run = ++generation
    if (!enabled) {
      ports.storage.set(key, true)
      state.value = {
        ...state.value!,
        analytics: { ...state.value!.analytics, enabled: false, collecting: false }
      }
    }
    if (enabled && (!published() || !version('analytics'))) throw new Error('正式统计说明尚未配置')
    type Pending = {
      method: string
      key: string
      body: { enabled: boolean; scope_version: string; expected_revision: number }
    }
    const pending = ports.storage.get(pendingKey) as Pending | undefined
    const options: Pending =
      pending?.body.enabled === enabled
        ? pending
        : {
            method: 'PUT',
            key: ports.key(),
            body: {
              enabled,
              scope_version: version('analytics'),
              expected_revision: state.value!.analytics.revision
            }
          }
    ports.storage.set(pendingKey, options)
    let result: PrivacyState['analytics']
    try {
      result = await ports.request<PrivacyState['analytics']>(
        '/api/mini/v1/me/analytics-preference',
        options
      )
    } catch (reason) {
      if ((reason as { status?: number }).status === 409) {
        ports.storage.remove(pendingKey)
        await restore(user)
      }
      throw reason
    }
    if (run !== generation || owner !== user) return
    state.value = { ...state.value!, analytics: result }
    ports.storage.remove(pendingKey)
    if (!enabled) ports.storage.remove(key)
  }

  /** 登录确认后持久标记拒绝统计，不依赖读取服务端状态成功
   * @param userId 本次可信登录返回的稳定账号
   */
  const block = (userId: string) => ports.storage.set(prefix + 'off:' + userId, true)
  /** 身份失效时清内存，保留当前账号未同步撤回记录 */
  const reset = () => {
    generation++
    owner = ''
    state.value = null
  }
  return {
    policies,
    state,
    version,
    published,
    confirmation,
    confirmed,
    shouldNotify,
    markShown,
    confirm,
    loadPolicies,
    restore,
    choose,
    isBlocked,
    block,
    reset
  }
}
