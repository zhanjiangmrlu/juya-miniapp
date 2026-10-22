import type { NativeShareMenuAPI } from '@/shared/types/share'

import { runtimeMode } from './runtime-mode'

/** 私页或摘要未就绪时关闭分享菜单，页面仅在公开字段备齐后放行
 * @param ready 当前页面是否可分享
 */
export const setShareMenu = (ready: boolean) => {
  if (typeof uni === 'undefined') return
  const platform = ((globalThis as typeof globalThis & { wx?: NativeShareMenuAPI }).wx ||
    uni) as NativeShareMenuAPI
  if (ready && !runtimeMode.update())
    platform.showShareMenu?.({
      withShareTicket: false,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  else platform.hideShareMenu?.({ menus: ['shareAppMessage', 'shareTimeline'] })
}
