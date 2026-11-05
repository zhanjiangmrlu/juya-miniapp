import type { AudioNavigationArguments, FullAudioOptions } from '@/shared/types/audio'

let current: FullAudioOptions | null = null
const installed = new WeakSet<object>()

/** 查询是否存在由学习页持有的背景音频会话 */
export const hasBackgroundAudioSession = () => current !== null

/** 成功离开页面才结束捕获的音轨，失败导航和新页面音轨不受影响
 * @param options 当前背景音轨的离页回调与原图覆盖层例外
 */
export const registerBackgroundAudioNavigation = (options: FullAudioOptions) => {
  current = options
  if (typeof uni !== 'undefined' && uni.addInterceptor && !installed.has(uni)) {
    installed.add(uni)
    for (const method of ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab', 'navigateBack']) {
      uni.addInterceptor(method, {
        invoke: (args: AudioNavigationArguments) => {
          const owner = current,
            success = args.success
          if (!owner || owner.keepOnNavigate?.(args.url || '')) return
          args.success = (result) => {
            if (current === owner) owner.leave()
            success?.(result)
          }
        }
      })
    }
  }
  return () => {
    if (current === options) current = null
  }
}
