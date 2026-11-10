import { defineStore } from 'pinia'
import { ref } from 'vue'

import { resetLearningAudioSession } from '@/features/learning/learning-audio-session'
import { analytics } from '@/services/analytics'
// #ifdef JUYA_ANALYTICS
import { businessAnalytics } from '@/services/analytics-business'
// #endif
import { onSessionExpired, operations, session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { clearFeedbackDrafts } from '@/services/feedback-service'
import { promptLogin } from '@/services/login-prompt'
import { loginReturn } from '@/services/login-return'
import { clearMediaAddresses } from '@/services/media-service'
import { resourceURL } from '@/services/platform'
import { privacy } from '@/services/privacy'
import { runtimeMode } from '@/services/runtime-mode'
import { Routes } from '@/shared/constants/navigation'
import {
  // #ifdef JUYA_ANALYTICS
  AnalyticsAction,
  // #endif
  AnalyticsEvent
} from '@/shared/enums/analytics'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AccountProfile } from '@/shared/types/account'
import type { PrivacyLoginOptions } from '@/shared/types/privacy'

export const useAccountStore = defineStore('learner-account', () => {
  const profile = ref<AccountProfile | null>(null),
    statistics = ref<components['schemas']['Statistics'] | null>(null),
    avatarURL = ref('')
  let restoring: Promise<AccountProfile | null> | null = null,
    generation = 0
  /** 清除个人界面和含输入正文的内存，保留服务器成绩 */
  const clear = () => {
    generation++
    privacy.reset()
    restoring = null
    clearFeedbackDrafts()
    resetLearningAudioSession()
    clearMediaAddresses()
    profile.value = null
    analytics.setAuthenticated(false)
    statistics.value = null
    avatarURL.value = ''
    operations.clearMemory()
  }
  onSessionExpired(() => {
    clear()
  })
  /** 恢复已有业务会话并确认真实账号，不自动调用微信登录 */
  const restore = async () => {
    if (restoring) return restoring
    const version = generation
    const job = session
      .restore()
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) return null
        throw reason
      })
      .then(async (value) => {
        if (version === generation) {
          profile.value = value
          analytics.setAuthenticated(!!value)
          if (value && privacy.published()) await privacy.restore(value.id).catch(() => undefined)
        }
        return value
      })
      .finally(() => {
        if (restoring === job) restoring = null
      })
    restoring = job
    return job
  }
  /** 页面显示前验证本人身份，游客继续保留只读访问
   * @param returnTarget 会话失效后的安全返回路径
   */
  const ensure = async (returnTarget: string) => {
    if (runtimeMode.update()) return false
    try {
      const value = profile.value || (await restore())
      if (!value) {
        promptLogin(returnTarget)
        return false
      }
      return true
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) return false
      throw reason
    }
  }
  /** 主动提交用户同意的微信身份登录
   * @param agreed 用户当前明确同意状态
   * @param options 当前展示的协议和独立统计选择
   */
  const login = async (agreed: boolean, options?: PrivacyLoginOptions) => {
    const version = ++generation
    const result = await session.login(agreed, options)
    if (version !== generation) throw new ApiError('session_changed', '登录身份已变化')
    clearMediaAddresses()
    resetLearningAudioSession()
    profile.value = result.user
    analytics.setAuthenticated(true)
    analytics.track(AnalyticsEvent.LOGIN_SUCCESS)
    return result.user
  }
  /** 读取服务器北京时间下的最新学习统计 */
  const refreshStatistics = async () => {
    const owner = session.userId()
    const value = await session.request<components['schemas']['Statistics']>(
      '/api/mini/v1/me/statistics'
    )
    if (owner && owner === session.userId()) statistics.value = value
    return value
  }
  /** 读取当前本人头像受控地址，不把长期URL作为身份或缓存 */
  const refreshAvatar = async () => {
    if (!profile.value?.avatar_id) {
      avatarURL.value = ''
      return
    }
    const owner = session.userId()
    const value = await session.request<components['schemas']['AvatarURL']>(
      '/api/mini/v1/me/avatar-url'
    )
    if (owner === session.userId()) avatarURL.value = value.url ? resourceURL(value.url) : ''
  }
  /** 主动确认退出后撤销服务器会话，再清理个人界面 */
  const logout = async () => {
    try {
      await session.logout()
    } catch (reason) {
      // #ifdef JUYA_ANALYTICS
      businessAnalytics.error(AnalyticsAction.LOGOUT, reason)
      // #endif
      throw reason
    }
    // #ifdef JUYA_ANALYTICS
    businessAnalytics.track(AnalyticsEvent.LOGOUT)
    // #endif
    clearFeedbackDrafts()
    clear()
    loginReturn.cancel()
    uni.switchTab({ url: Routes.HOME })
  }
  /** 更新一次已确认的同账号资料
   * @param value 已由服务器提交的本人资料
   */
  const acceptProfile = (value: AccountProfile) => {
    if (value.id === session.userId()) profile.value = value
  }
  return {
    profile,
    statistics,
    avatarURL,
    restore,
    ensure,
    login,
    refreshStatistics,
    refreshAvatar,
    logout,
    acceptProfile,
    clear
  }
})
