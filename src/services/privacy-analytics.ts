import { ref, watch } from 'vue'

import { analytics } from '@/services/analytics'
import { session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { privacy } from '@/services/privacy'
import { runtimeMode } from '@/services/runtime-mode'

import type { CanonicalAnalyticsEvent, PrivacyAnalyticsAccount } from '@/shared/types/privacy'

/** 将当前可信账号、协议及独立许可同步给隔离统计运行时
 * @param account 已由现有微信会话恢复的账号状态
 */
export const configurePrivacyAnalytics = (account: PrivacyAnalyticsAccount) => {
  const blockedOwner = ref('')
  let recoveryGeneration = 0,
    blockedRevision = 0
  /** 完整刷新目录与账号许可前维持拒绝状态，旧身份回调不能解除新阻断
   * @param owner 被拒绝时的可信账号
   * @param identity 本次会话代际
   * @param run 本次恢复代际
   */
  const recover = async (
    owner: string,
    identity: ReturnType<typeof session.identity>,
    run: number
  ) => {
    try {
      await privacy.loadPolicies()
      if (identity !== session.identity() || run !== recoveryGeneration) return
      await privacy.restore(owner)
      if (identity !== session.identity() || run !== recoveryGeneration) return
      blockedOwner.value = ''
    } catch {
      // 明确拒绝后的未知状态保持关闭，后续明确选择或冷启动可重新核对
    }
  }
  analytics.configure({
    context: () => {
      const owner = session.userId()
      return {
        owner:
          owner &&
          account.profile?.id === owner &&
          privacy.currentOwner() === owner &&
          Date.parse(session.expiresAt()) > Date.now()
            ? owner
            : null,
        revision: privacy.state.value?.analytics.revision || 0,
        enabled:
          privacy.state.value?.analytics.enabled === true &&
          privacy.state.value.analytics.scope_version === privacy.version('analytics') &&
          !privacy.isBlocked(),
        scopeVersion: privacy.version('analytics'),
        policiesReady:
          privacy.published() &&
          privacy.confirmed() &&
          !!privacy.version('analytics') &&
          privacy.policies.value.analytics_available === true &&
          blockedOwner.value !== owner &&
          !runtimeMode.browseOnly.value
      }
    },
    authorize: async (event: CanonicalAnalyticsEvent) => {
      const identity = session.identity()
      try {
        const response = await session.request<{ accepted: boolean }>(
          '/api/mini/v1/analytics/events',
          {
            method: 'POST',
            body: event
          }
        )
        if (response.accepted !== true) throw new Error('统计事件尚未确认')
      } catch (reason) {
        if (
          identity === session.identity() &&
          event.consent_revision === privacy.state.value?.analytics.revision &&
          reason instanceof ApiError &&
          [401, 403, 409, 503].includes(reason.status)
        ) {
          const state = privacy.state.value,
            owner = session.userId()
          blockedRevision = state?.analytics.revision || 0
          blockedOwner.value = owner || ''
          if (state)
            privacy.state.value = {
              ...state,
              analytics: { ...state.analytics, enabled: false, collecting: false }
            }
          if (owner) void recover(owner, identity, ++recoveryGeneration)
        }
        throw reason
      }
    },
    currentPage: () =>
      typeof getCurrentPages === 'undefined' ? '' : getCurrentPages().at(-1)?.route || ''
  })
  watch(
    [
      () => account.profile?.id,
      privacy.state,
      privacy.policies,
      runtimeMode.browseOnly,
      blockedOwner
    ],
    () => {
      const revision = privacy.state.value?.analytics.revision || 0
      if (blockedOwner.value === session.userId() && revision > blockedRevision) {
        blockedRevision = revision
        void recover(blockedOwner.value, session.identity(), ++recoveryGeneration)
      }
      analytics.sync()
    },
    { flush: 'sync', deep: true, immediate: true }
  )
}
