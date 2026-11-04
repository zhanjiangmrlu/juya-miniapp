import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { getCurrentInstance, provide, readonly, ref, watch } from 'vue'

import { runtimeMode } from '@/services/runtime-mode'
import { Routes } from '@/shared/constants/navigation'
import { PAGE_SHARE_ENTRY_KEY } from '@/shared/constants/share'

/** 通用朋友圈分享仅展示品牌摘要，进入完整模式后回到首页 */
export const usePageShareEntry = () => {
  const homeEntry = ref(false)
  if (getCurrentInstance()) provide(PAGE_SHARE_ENTRY_KEY, readonly(homeEntry))
  let visible = false,
    redirected = false,
    restoreOnShow = false
  /** 仅当前可见的通用分享入口跳转，不恢复发送者页面和参数 */
  const openHome = () => {
    if (!homeEntry.value || !visible || redirected || runtimeMode.update()) return
    redirected = true
    uni.switchTab({ url: Routes.HOME })
  }
  onLoad((query) => {
    homeEntry.value = query?.target === 'home'
    redirected = false
    restoreOnShow = false
  })
  onShow(() => {
    // Tab 页跳首页后仍会缓存，再次主动进入时恢复本人正常业务
    if (restoreOnShow) {
      homeEntry.value = false
      restoreOnShow = false
    }
    visible = true
    openHome()
  })
  onHide(() => {
    visible = false
    if (redirected) restoreOnShow = true
  })
  const stop = watch(runtimeMode.browseOnly, (restricted) => {
    if (!restricted) openHome()
  })
  onUnload(() => {
    visible = false
    stop()
  })
  return readonly(homeEntry)
}
