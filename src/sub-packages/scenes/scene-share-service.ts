import { computed, reactive, ref } from 'vue'

import { homeShare, shareTargetQuery, shareTargetURL } from '@/services/share-service'
import {
  BRAND_SHARE_FRIENDS,
  BRAND_SHARE_TIMELINE,
  BRAND_SHARE_TITLE,
  SHARE_ID_PATTERN
} from '@/shared/constants/share'
import { ShareChannel, ShareTarget } from '@/shared/enums/share'

import type {
  FriendsShare,
  PublicSceneShare,
  ShareChannelState,
  SharePorts,
  TimelineShare
} from '@/shared/types/share'

/** 检查公开摘要的目标和标题，不读取私人正文
 * @param value 服务端公开摘要
 * @param cardId 本次请求的稳定卡片编号
 */
const validSummary = (value: PublicSceneShare, cardId: string) =>
  value?.card_id === cardId &&
  SHARE_ID_PATTERN.test(value.version_id) &&
  typeof value.name === 'string' &&
  typeof value.title_en === 'string'
/** 每个渠道分别验证公开路径与规格，错误渠道不得阻断另一安全渠道
 * @param value 已确认目标的公开摘要
 * @param channel 本次准备的原生分享渠道
 */
const validImage = (value: PublicSceneShare, channel: ShareChannel) => {
  const image = value.images?.[channel]
  return (
    image?.width === 600 &&
    image.height === (channel === ShareChannel.FRIENDS ? 480 : 600) &&
    image.url ===
      `/api/mini/v1/public/cards/${encodeURIComponent(value.card_id)}/share/images/${encodeURIComponent(value.version_id)}/${channel}`
  )
}
/** 准备匿名分享摘要，不读取业务会话或个人资料
 * @param ports 无鉴权 HTTP 与受控公开资源端口
 */
export const createShareService = (ports: SharePorts) => {
  const summary = ref<PublicSceneShare | null>(null),
    summaryBusy = ref(false),
    error = ref(''),
    channels = reactive<Record<ShareChannel, ShareChannelState>>({
      friends: { ready: false, busy: false, error: '' },
      timeline: { ready: false, busy: false, error: '' }
    }),
    ready = computed(() => channels.friends.ready || channels.timeline.ready),
    busy = computed(() => summaryBusy.value || channels.friends.busy || channels.timeline.busy)
  let generation = 0,
    targetId = '',
    expectedVersion = '',
    pending: Promise<void> | null = null
  const files = { friends: '', timeline: '' },
    jobs: Partial<Record<ShareChannel, Promise<void>>> = {}
  /** 清除旧版本和在途任务，迟到响应不能恢复菜单 */
  const clear = () => {
    generation++
    summary.value = null
    summaryBusy.value = false
    error.value = ''
    pending = null
    for (const channel of [ShareChannel.FRIENDS, ShareChannel.TIMELINE]) {
      Object.assign(channels[channel], { ready: false, busy: false, error: '' })
      files[channel] = ''
      delete jobs[channel]
    }
  }
  /** 独立准备一个原生渠道，重复点击复用同一个图片请求
   * @param channel 要准备的好友或朋友圈渠道
   * @param data 当前已校验的公开摘要
   * @param run 摘要所属的生命周期代次
   */
  const prepareChannel = (
    channel: ShareChannel,
    data: PublicSceneShare,
    run: number
  ): Promise<void> => {
    if (jobs[channel]) return jobs[channel]!
    if (channels[channel].ready) return Promise.resolve()
    const state = channels[channel]
    state.busy = true
    state.error = ''
    const job = (async () => {
      await Promise.resolve()
      if (run !== generation) return
      try {
        if (!validImage(data, channel)) throw new Error('分享封面暂不可用，请重试')
        const image = data.images[channel]
        const file = await (ports.prepareImage
          ? ports.prepareImage(image.url, image.width, image.height)
          : Promise.resolve(ports.resource(image.url)))
        if (run !== generation) return
        if (!file) throw new Error('分享封面暂不可用，请重试')
        files[channel] = file
        state.ready = true
      } catch (reason) {
        if (run === generation)
          state.error = reason instanceof Error ? reason.message : '分享封面暂不可用，请重试'
      } finally {
        if (run === generation) {
          state.busy = false
          delete jobs[channel]
        }
      }
    })()
    jobs[channel] = job
    return job
  }
  /** 合并同目标和版本的摘要请求，返回页面时可显式重验发布状态
   * @param cardId 当前稳定卡片编号
   * @param versionId 完整模式当前展示的不可变版本，摘要模式可省略
   * @param revalidate 页面重新显示时是否重验已缓存摘要
   */
  const prepare = (cardId: string, versionId = '', revalidate = false): Promise<void> => {
    if (targetId === cardId && expectedVersion === versionId) {
      if (pending) return pending
      if (summary.value && !revalidate) return Promise.resolve()
    }
    clear()
    targetId = cardId
    expectedVersion = versionId
    const run = generation
    summaryBusy.value = true
    const job = (async () => {
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
        if (versionId && data.version_id !== versionId) throw new Error('内容已更新，请刷新后分享')
        summary.value = data
        summaryBusy.value = false
        await Promise.allSettled([
          prepareChannel(ShareChannel.FRIENDS, data, run),
          prepareChannel(ShareChannel.TIMELINE, data, run)
        ])
      } catch (reason) {
        if (run === generation)
          error.value = reason instanceof Error ? reason.message : '分享摘要暂不可用，请重试'
      } finally {
        if (run === generation) {
          summaryBusy.value = false
          pending = null
        }
      }
    })()
    pending = job
    return job
  }
  /** 只重试失败渠道，摘要失败时重新获取最小公开摘要
   * @param channel 用户在弹层选择重试的原生渠道
   */
  const retry = (channel: ShareChannel) =>
    summary.value
      ? prepareChannel(channel, summary.value, generation)
      : prepare(targetId, expectedVersion)
  /** 构造好友参数，意外调用也保留当前场景目标，未准备时菜单仍关闭 */
  const friends = (): FriendsShare => {
    const value = summary.value
    return {
      title: value ? value.name + (value.title_en ? `｜${value.title_en}` : '') : BRAND_SHARE_TITLE,
      path: SHARE_ID_PATTERN.test(targetId)
        ? shareTargetURL({ target: ShareTarget.SCENE, id: targetId })
        : homeShare.friends.path,
      imageUrl: channels.friends.ready ? files.friends : BRAND_SHARE_FRIENDS
    }
  }
  /** 构造朋友圈参数，只暴露白名单目标和公开封面 */
  const timeline = (): TimelineShare => {
    const value = summary.value
    return {
      title: value ? value.name + (value.title_en ? `｜${value.title_en}` : '') : BRAND_SHARE_TITLE,
      query: SHARE_ID_PATTERN.test(targetId)
        ? shareTargetQuery({ target: ShareTarget.SCENE, id: targetId })
        : homeShare.timeline.query,
      imageUrl: channels.timeline.ready ? files.timeline : BRAND_SHARE_TIMELINE
    }
  }
  return {
    summary,
    summaryBusy,
    channels,
    ready,
    busy,
    error,
    prepare,
    retry,
    clear,
    friends,
    timeline
  }
}
