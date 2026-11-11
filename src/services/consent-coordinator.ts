import { ref } from 'vue'

import { session } from '@/services/api'
import { pauseBackgroundAudio } from '@/services/audio-navigation'
import { loginReturn } from '@/services/login-return'
import { privacy } from '@/services/privacy'
import { Routes } from '@/shared/constants/navigation'
export const automaticConsent = ref(false)
export const readingPolicy = ref(false)
let launch: Promise<unknown> | undefined,
  pending = false
let ownsReadingSnapshot = false
/** 仅冷启动加载协议并建立一次首页待告知判断 */
export const prepareConsentLaunch = () => {
  pending = true
  launch = privacy.loadPolicies().catch(() => undefined)
}
/** 首次到达首页时消费启动判断，普通返回不重复评估
 * @param show 首页承载弹窗的显示回调
 * @param isVisible 当前首页是否仍然可见
 */
export const considerHomeConsent = async (
  show: (target: string) => void,
  isVisible: () => boolean = () => true
) => {
  await launch
  if (privacy.published()) {
    const user = session.userId()
    if (user) {
      try {
        await privacy.restore(user)
      } catch {
        return
      }
    }
  }
  if (!pending || !isVisible()) return
  pending = false
  if (privacy.shouldNotify()) {
    privacy.markShown()
    automaticConsent.value = true
    show(Routes.HOME)
  }
}
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
