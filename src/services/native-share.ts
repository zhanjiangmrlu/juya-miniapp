import type { NativeShareMenuAPI, ShareMenuChannels } from '@/shared/types/share'

import { runtimeMode } from './runtime-mode'

/** 私页或摘要未就绪时关闭分享菜单，页面仅在公开字段备齐后放行
 * @param ready 当前页面是否可分享
 */
export const setShareMenu = (ready: boolean | ShareMenuChannels) => {
  if (typeof uni === 'undefined') return
  const platform = ((globalThis as typeof globalThis & { wx?: NativeShareMenuAPI }).wx ||
    uni) as NativeShareMenuAPI
  if (ready && !runtimeMode.update()) {
    const menus =
        typeof ready === 'boolean'
          ? ['shareAppMessage', 'shareTimeline']
          : [ready.friends ? 'shareAppMessage' : '', ready.timeline ? 'shareTimeline' : ''].filter(
              Boolean
            ),
      hidden = ['shareAppMessage', 'shareTimeline'].filter((menu) => !menus.includes(menu))
    if (hidden.length) platform.hideShareMenu?.({ menus: hidden })
    if (!menus.length) return
    platform.showShareMenu?.({
      withShareTicket: false,
      menus
    })
  } else platform.hideShareMenu?.({ menus: ['shareAppMessage', 'shareTimeline'] })
}
