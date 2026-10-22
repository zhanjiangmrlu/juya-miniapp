import { ref } from 'vue'

import { Routes } from '@/shared/constants/navigation'
import {
  BRAND_SHARE_FRIENDS,
  BRAND_SHARE_TIMELINE,
  BRAND_SHARE_TITLE,
  SHARE_ID_PATTERN
} from '@/shared/constants/share'
import { ShareTarget } from '@/shared/enums/share'

import type {
  FriendsShare,
  PublicSceneShare,
  SafeShareTarget,
  SharePorts,
  TimelineShare
} from '@/shared/types/share'

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
/** 检查公开封面属于当前摘要和固定比例，绝不回退私有原图
 * @param value 服务端公开摘要
 * @param cardId 本次请求的稳定卡片编号
 */
const validSummary = (value: PublicSceneShare, cardId: string) =>
  value?.card_id === cardId &&
  SHARE_ID_PATTERN.test(value.version_id) &&
  typeof value.name === 'string' &&
  typeof value.title_en === 'string' &&
  Object.entries({ friends: 480, timeline: 600 }).every(([variant, height]) => {
    const image = value.images?.[variant as 'friends' | 'timeline']
    return (
      image?.width === 600 &&
      image.height === height &&
      image.url ===
        `/api/mini/v1/public/cards/${encodeURIComponent(cardId)}/share/images/${encodeURIComponent(value.version_id)}/${variant}`
    )
  })
/** 准备匿名分享摘要，不读取业务会话或个人资料
 * @param ports 无鉴权 HTTP 与受控公开资源端口
 */
export const createShareService = (ports: SharePorts) => {
  const summary = ref<PublicSceneShare | null>(null),
    ready = ref(false),
    busy = ref(false),
    error = ref('')
  let generation = 0,
    friendsImage = '',
    timelineImage = ''
  /** 清除旧发布封面，让菜单在再次核对前保持关闭 */
  const clear = () => {
    generation++
    summary.value = null
    ready.value = false
    busy.value = false
    error.value = ''
    friendsImage = ''
    timelineImage = ''
  }
  /** 请求当前发布的最小摘要，迟到结果不能恢复旧卡片菜单
   * @param cardId 当前稳定卡片编号
   */
  const prepare = async (cardId: string) => {
    clear()
    const run = generation
    busy.value = true
    try {
      if (!SHARE_ID_PATTERN.test(cardId)) throw new Error('未找到这张场景卡')
      const response = await ports.send({
        path: `/api/mini/v1/public/cards/${encodeURIComponent(cardId)}/share`,
        method: 'GET',
        headers: {}
      })
      if (run !== generation) return
      const data = response.data as PublicSceneShare & { error?: { message?: string } }
      if (response.status !== 200)
        throw new Error(data?.error?.message || '分享摘要暂不可用，请重试')
      if (!validSummary(data, cardId)) throw new Error('分享封面暂不可用，请重试')
      const files = await Promise.all(
        [data.images.friends, data.images.timeline].map((image) =>
          ports.prepareImage
            ? ports.prepareImage(image.url, image.width, image.height)
            : Promise.resolve(ports.resource(image.url))
        )
      )
      if (run !== generation) return
      if (!files.every(Boolean)) throw new Error('分享封面暂不可用，请重试')
      friendsImage = files[0]!
      timelineImage = files[1]!
      summary.value = data
      ready.value = true
    } catch (reason) {
      if (run === generation)
        error.value = reason instanceof Error ? reason.message : '分享摘要暂不可用，请重试'
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 构造原生好友参数，异常触发时也明确指定安全品牌封面 */
  const friends = (): FriendsShare => {
    const value = summary.value
    return ready.value && value
      ? {
          title: value.name + (value.title_en ? `｜${value.title_en}` : ''),
          path: shareTargetURL({ target: ShareTarget.SCENE, id: value.card_id }),
          imageUrl: friendsImage
        }
      : { ...homeShare.friends }
  }
  /** 构造原生朋友圈参数，不依赖异步返回或不存在的取消接口 */
  const timeline = (): TimelineShare => {
    const value = summary.value
    return ready.value && value
      ? {
          title: value.name + (value.title_en ? `｜${value.title_en}` : ''),
          query: shareTargetQuery({ target: ShareTarget.SCENE, id: value.card_id }),
          imageUrl: timelineImage
        }
      : { ...homeShare.timeline }
  }
  return { summary, ready, busy, error, prepare, clear, friends, timeline }
}
