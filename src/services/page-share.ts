import { Routes } from '@/shared/constants/navigation'
import { PAGE_SHARE_COVERS, PAGE_SHARE_QUERY, PAGE_SHARE_TITLE } from '@/shared/constants/share'
import { ShareChannel } from '@/shared/enums/share'

import type { FriendsShare, TimelineShare } from '@/shared/types/share'

import { createPageShareCoverCache } from './page-share-cover-cache'

const covers = createPageShareCoverCache(PAGE_SHARE_COVERS)

/** 提前准备两个通用分享渠道的公开封面，不阻塞页面或分享入口 */
export const preparePageShareCovers = () => covers.prepare()

export const pageShare: { friends: FriendsShare; timeline: TimelineShare } = {
  /** 分享发生时同步确认缓存，未就绪或被系统回收则立即用本地小图 */
  get friends() {
    return {
      title: PAGE_SHARE_TITLE,
      path: Routes.HOME,
      imageUrl: covers.image(ShareChannel.FRIENDS)
    }
  },
  /** 朋友圈保留原首页落地参数，图片准备与好友渠道相互独立 */
  get timeline() {
    return {
      title: PAGE_SHARE_TITLE,
      query: PAGE_SHARE_QUERY,
      imageUrl: covers.image(ShareChannel.TIMELINE)
    }
  }
}
