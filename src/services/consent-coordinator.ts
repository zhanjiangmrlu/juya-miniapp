import { ref } from 'vue'

import { pauseBackgroundAudio } from '@/services/audio-navigation'
import { loginReturn } from '@/services/login-return'
import { privacy } from '@/services/privacy'

import type { PolicyBundle } from '@/shared/types/privacy'
export const automaticConsent = ref(false)
export const readingPolicy = ref(false)
let ownsReadingSnapshot = false
let consentPolicies: Promise<PolicyBundle> | undefined
/** 同一次主动提示的多个缓存页面共享正式政策读取，结束后允许下一次重新核实 */
export const loadConsentPolicies = () => {
  if (!consentPolicies) {
    const job = privacy.loadPolicies().finally(() => {
      if (consentPolicies === job) consentPolicies = undefined
    })
    consentPolicies = job
  }
  return consentPolicies
}
/** 保留旧启动调用兼容入口，启动不再读取政策或安排自动告知 */
export const prepareConsentLaunch = () => undefined
/** 保留旧首页调用兼容入口，任何进入路径均不自动提示
 * @param _show 已停用的首页提示回调
 * @param _isVisible 已停用的首页可见性判断
 */
export const considerHomeConsent = async (
  _show: (target: string) => void,
  _isVisible: () => boolean = () => true
) => undefined
/** 原位阅读政策，保留调用页面和弹窗状态
 * @param kind 用户选择的已发布协议种类
 */
export const openPolicy = (kind: string) => {
  ownsReadingSnapshot = !loginReturn.pending()
  if (ownsReadingSnapshot) loginReturn.pauseForReading()
  pauseBackgroundAudio()
  readingPolicy.value = true
  uni.navigateTo({
    url: `/sub-packages/account/policy?kind=${encodeURIComponent(kind)}`,
    fail: () => {
      finishPolicy()
    }
  })
}

/** 仅恢复本次协议阅读建立的快照，不结算正在登录的来源 */
export const finishPolicy = () => {
  readingPolicy.value = false
  if (ownsReadingSnapshot) loginReturn.resumeGuest(true)
  ownsReadingSnapshot = false
}
