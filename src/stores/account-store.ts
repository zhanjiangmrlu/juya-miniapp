import { defineStore } from 'pinia'
import { ref } from 'vue'

import { resetLearningAudioSession } from '@/features/learning/learning-audio-session'
import { onSessionExpired, operations, session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { clearFeedbackDrafts } from '@/services/feedback-service'
import { clearMediaAddresses } from '@/services/media-service'
import { openLogin } from '@/services/navigation'
import { resourceURL } from '@/services/platform'
import { Routes } from '@/shared/constants/navigation'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AccountProfile } from '@/shared/types/account'

export const useAccountStore = defineStore('learner-account', () => {
  const profile = ref<AccountProfile | null>(null),
    statistics = ref<components['schemas']['Statistics'] | null>(null),
    avatarURL = ref('')
  let restoring: Promise<AccountProfile | null> | null = null,
    target: string = Routes.LEARNING,
    generation = 0
  /** 清除个人界面和含输入正文的内存，保留服务器成绩 */
  const clear = () => {
    generation++
    resetLearningAudioSession()
    clearMediaAddresses()
    profile.value = null
    statistics.value = null
    avatarURL.value = ''
    operations.clearMemory()
  }
  onSessionExpired(() => {
    clear()
    openLogin(target)
  })
  /** 恢复已有业务会话并确认真实账号，不自动调用微信登录 */
  const restore = async () => {
    if (restoring) return restoring
    const version = generation
    restoring = session
      .restore()
      .then((value) => {
        if (version === generation) profile.value = value
        return value
      })
      .finally(() => {
        restoring = null
      })
    return restoring
  }
  /** 页面显示前验证本人身份，空联系方式不影响访问
   * @param returnTarget 会话失效后的安全返回路径
   */
  const ensure = async (returnTarget: string) => {
    target = returnTarget
    try {
      const value = profile.value || (await restore())
      if (!value) {
        openLogin(returnTarget)
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
   */
  const login = async (agreed: boolean) => {
    const result = await session.login(agreed)
    clearMediaAddresses()
    resetLearningAudioSession()
    profile.value = result.user
    return result.user
  }
  /** 读取服务器北京时间下的最新学习统计 */
  const refreshStatistics = async () => {
    const owner = session.userId()
    const value = await session.request<components['schemas']['Statistics']>(
      '/api/mini/v1/me/statistics'
    )
    if (owner === session.userId()) statistics.value = value
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
    await session.logout()
    clearFeedbackDrafts()
    clear()
    openLogin(Routes.LEARNING)
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
