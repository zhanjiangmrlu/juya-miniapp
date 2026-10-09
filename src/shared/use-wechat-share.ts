import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, toValue, watch } from 'vue'

import { getAnalytics } from '@/services/analytics/runtime'
import {
  SHARE_COVER_URL,
  SHARE_HOME_ROUTE,
  SHARE_HOME_TITLE,
  SHARE_SCENE_ID_PATTERN,
  SHARE_SCENE_ROUTE
} from '@/shared/constants/sharing'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { ShareChannel, ShareTarget } from '@/shared/enums/sharing'

import type { WechatShareHooks, WechatShareOptions } from '@/shared/types/sharing'

/** 统一微信分享，options 为公开内容配置，hooks 为页面显式导入的原生分享钩子以供编译器识别 */
export const useWechatShare = (options: WechatShareOptions, hooks: WechatShareHooks) => {
  const scene = computed(() =>
    options.target === ShareTarget.SCENE ? toValue(options.scene) : undefined
  )
  const ready = computed(
    () =>
      options.target === ShareTarget.HOME ||
      Boolean(scene.value && SHARE_SCENE_ID_PATTERN.test(scene.value.sceneId))
  )
  let visible = false
  let routeSceneId: string | undefined
  /** 当前页面显示时同步分享菜单，加载或权限失败时隐藏场景分享 */
  const syncMenu = () => {
    if (!visible) return
    try {
      if (ready.value)
        uni.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'], fail: () => {} })
      // 当前 uni 类型合并了其他平台必填字段，微信实际使用 menus
      else
        uni.hideShareMenu({
          menus: ['shareAppMessage', 'shareTimeline'],
          hideShareItems: ['shareAppMessage', 'shareTimeline'],
          fail: () => {}
        })
    } catch {
      /* 旧版微信不支持朋友圈时不影响业务 */
    }
  }
  /** 生成白名单分享参数，channel 为微信渠道，source 为用户点击按钮或菜单 */
  const content = (channel: ShareChannel, source: 'button' | 'menu') => {
    // 朋友圈不能改页面路径；失效后的迟到回调保留合法路由 ID，由接收方重新校验权限
    const target =
      channel === ShareChannel.TIMELINE || ready.value ? options.target : ShareTarget.HOME
    const sceneId =
      target === ShareTarget.SCENE ? (ready.value ? scene.value?.sceneId : routeSceneId) : undefined
    const route = target === ShareTarget.SCENE ? SHARE_SCENE_ROUTE : SHARE_HOME_ROUTE
    const query =
      target === ShareTarget.SCENE && !sceneId
        ? ''
        : `share_channel=${channel}&share_target=${target}${sceneId ? `&sceneId=${encodeURIComponent(sceneId)}` : ''}`
    if (visible && ready.value) {
      try {
        getAnalytics().track(AnalyticsEvent.SHARE_INITIATE, {
          page_code: route,
          share_channel: channel,
          share_target: target,
          entry_source: source,
          ...(sceneId ? { content_scene_id: sceneId } : {})
        })
      } catch {
        /* 统计故障不阻止用户分享 */
      }
    }
    return {
      title:
        target === ShareTarget.SCENE && ready.value
          ? `句芽英语｜${scene.value!.title.slice(0, 40)}`
          : SHARE_HOME_TITLE,
      imageUrl: SHARE_COVER_URL,
      route,
      query
    }
  }
  // #ifdef MP-WEIXIN
  /** 用户主动打开好友分享，event 为微信提供的按钮或菜单来源 */
  hooks.onShareAppMessage((event) => {
    const result = content(ShareChannel.FRIEND, event.from === 'button' ? 'button' : 'menu')
    return {
      title: result.title,
      imageUrl: result.imageUrl,
      path: `/${result.route}?${result.query}`
    }
  })
  /** 用户主动打开朋友圈分享，朋友圈沿用当前页面，仅设置安全 query */
  hooks.onShareTimeline(() => {
    const result = content(ShareChannel.TIMELINE, 'menu')
    return { title: result.title, imageUrl: result.imageUrl, query: result.query }
  })
  /** 首次加载时统计分享回流，query 为微信落地参数，不在前后台恢复时重复记 */
  onLoad((query) => {
    const id = query?.sceneId
    routeSceneId = typeof id === 'string' && SHARE_SCENE_ID_PATTERN.test(id) ? id : undefined
    try {
      getAnalytics().shareLanding({
        path: options.target === ShareTarget.SCENE ? SHARE_SCENE_ROUTE : SHARE_HOME_ROUTE,
        query
      })
    } catch {
      /* 统计故障不影响落地页加载 */
    }
  })
  /** 页面可见时才允许菜单及发起事件 */
  onShow(() => {
    visible = true
    syncMenu()
  })
  /** 隐藏后忽略迟到分享钩子的统计 */
  onHide(() => {
    visible = false
  })
  /** 销毁后不再统计本页分享 */
  onUnload(() => {
    visible = false
  })
  watch(ready, syncMenu)
  // #endif
  return { shareReady: ready }
}
