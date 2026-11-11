import type { AppUpdateManager, AppUpdatePlatform } from '@/shared/types/app-update'

/** 协调下载就绪与前后台入口，同一次进入只展示一次更新提示
 * @param platform 微信更新管理器与原生弹窗边界
 */
export const createAppUpdateCoordinator = (platform: AppUpdatePlatform) => {
  let manager: AppUpdateManager | undefined
  let initialized = false,
    foreground = false,
    ready = false,
    failed = false,
    presenting = false,
    applied = false,
    entry = 0,
    shownEntry = -1

  /** 下载完成后提示重启，失败提示只告知重进，不阻塞当前学习 */
  const prompt = () => {
    if (!foreground || presenting || applied || shownEntry === entry || (!ready && !failed)) return
    presenting = true
    shownEntry = entry
    const canApply = ready
    try {
      platform.showModal({
        title: canApply ? '更新提示' : '更新失败',
        content: canApply
          ? '新版本已经准备好，是否立即重启更新？'
          : '更新下载失败，请检查网络后重新进入小程序',
        confirmText: canApply ? '立即更新' : '知道了',
        cancelText: '稍后',
        showCancel: canApply,
        success: (result) => {
          if (canApply && result.confirm && !applied) {
            applied = true
            manager?.applyUpdate()
          }
        },
        complete: () => {
          presenting = false
          // 跨前后台仍打开的弹窗属于本次进入，不再紧接着提示
          shownEntry = entry
        }
      })
    } catch {
      presenting = false
    }
  }
  /** 启动时只注册一次，非微信或低版本平台安全跳过 */
  const launch = () => {
    if (initialized) return
    initialized = true
    try {
      manager = platform.getUpdateManager?.()
      manager?.onUpdateReady(() => {
        ready = true
        failed = false
        prompt()
      })
      manager?.onUpdateFailed(() => {
        if (ready) return
        failed = true
        prompt()
      })
    } catch {
      manager = undefined
    }
  }
  /** 每次进入前台，重新提示上次选择稍后的已下载更新 */
  const show = () => {
    foreground = true
    entry++
    prompt()
  }
  /** 后台下载回调只记录状态，等待进入前台再提示 */
  const hide = () => {
    foreground = false
  }
  return { launch, show, hide }
}

export const appUpdates = createAppUpdateCoordinator({
  getUpdateManager: () => uni.getUpdateManager?.(),
  showModal: (options) => {
    uni.showModal(options)
  }
})
