import { ref } from 'vue'

import { setShareMenu } from '@/services/native-share'
import { runtimeMode } from '@/services/runtime-mode'

/** 管理分享预览和页面隐藏边界，原生回调须在页面直接注册供编译器识别 */
export const useNativeShare = () => {
  const open = ref(false)
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
