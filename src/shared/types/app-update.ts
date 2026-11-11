export interface AppUpdateManager {
  onUpdateReady: (callback: () => void) => void
  onUpdateFailed: (callback: () => void) => void
  applyUpdate: () => void
}

export interface AppUpdatePlatform {
  getUpdateManager?: () => AppUpdateManager | undefined
  showModal: (options: {
    title: string
    content: string
    confirmText?: string
    cancelText?: string
    showCancel?: boolean
    success?: (result: { confirm: boolean; cancel: boolean }) => void
    complete?: () => void
  }) => void
}
