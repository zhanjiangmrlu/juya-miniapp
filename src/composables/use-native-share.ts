import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { ref } from 'vue'

import { setShareMenu } from '@/services/native-share'
import { runtimeMode } from '@/services/runtime-mode'

import type { FriendsShare, TimelineShare } from '@/shared/types/share'

/** 注册真实原生分享回调，只返回微信支持的安全字段
 * @param friends 已备齐封面和目标的好友分享构造函数
 * @param timeline 已备齐正方形封面和目标的朋友圈构造函数
 */
export const useNativeShare = (friends: () => FriendsShare, timeline: () => TimelineShare) => {
  const open = ref(false)
  onShareAppMessage(() => ({ ...friends() }))
  onShareTimeline(() => ({ ...timeline() }))
  /** 仅完整模式允许打开预览，平台菜单由当前页面就绪状态控制 */
  const show = () => {
    if (!runtimeMode.update()) open.value = true
  }
  /** 关闭弹层时保留已备齐渠道的顶部原生菜单 */
  const close = () => {
    open.value = false
  }
  /** 隐藏页面时同时关闭预览和原生菜单 */
  const hide = () => {
    open.value = false
    setShareMenu(false)
  }
  return { open, show, close, hide }
}
