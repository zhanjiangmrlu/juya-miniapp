import { Routes } from '@/shared/constants/navigation'
import {
  BRAND_SHARE_FRIENDS,
  BRAND_SHARE_TIMELINE,
  BRAND_SHARE_TITLE,
  SHARE_ID_PATTERN
} from '@/shared/constants/share'
import { ShareTarget } from '@/shared/enums/share'

import type { FriendsShare, SafeShareTarget, TimelineShare } from '@/shared/types/share'

/** 仅接受分享白名单中的稳定目标，不沿用发送者状态
 * @param query 页面收到的非可信查询参数
 */
export const parseShareTarget = (query: Record<string, unknown>): SafeShareTarget | null => {
  if (query.target === ShareTarget.LEARNING) return { target: ShareTarget.LEARNING }
  return query.target === ShareTarget.SCENE &&
    typeof query.id === 'string' &&
    SHARE_ID_PATTERN.test(query.id)
    ? { target: ShareTarget.SCENE, id: query.id }
    : null
}
/** 构造只含目标类型与稳定卡片编号的原生分享参数
 * @param target 已通过白名单验证的目标
 */
export const shareTargetQuery = (target: SafeShareTarget) =>
  target.target === ShareTarget.LEARNING
    ? 'target=learning'
    : `target=scene&id=${encodeURIComponent(target.id)}`
/** 构造本人登录后的安全返回路径
 * @param target 分享接收方的安全目标
 */
export const shareTargetURL = (target: SafeShareTarget) =>
  `${target.target === ShareTarget.LEARNING ? Routes.LEARNING : Routes.SCENE}?${shareTargetQuery(target)}`
export const homeShare: { friends: FriendsShare; timeline: TimelineShare } = {
  friends: {
    title: BRAND_SHARE_TITLE,
    path: shareTargetURL({ target: ShareTarget.LEARNING }),
    imageUrl: BRAND_SHARE_FRIENDS
  },
  timeline: { title: BRAND_SHARE_TITLE, query: 'target=learning', imageUrl: BRAND_SHARE_TIMELINE }
}
