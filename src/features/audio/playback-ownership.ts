let owner: object | undefined
let cancel: (() => void) | undefined

/** 获取全局设备所有权，next 为当前控制器，stop 为被其他播放替换时的清理回调 */
export const claimPlayback = (next: object, stop: () => void): void => {
  if (owner === next) return
  const previous = cancel
  owner = next
  cancel = stop
  previous?.()
}

/** 释放全局所有权，current 为已经停止的控制器 */
export const releasePlayback = (current: object): void => {
  if (owner !== current) return
  owner = undefined
  cancel = undefined
}
