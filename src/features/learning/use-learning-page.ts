import { ref, watch } from 'vue'

import { getAnalytics } from '@/services/analytics/runtime'
import { getRuntimeServices } from '@/services/runtime'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'
import { useLearningStore } from '@/stores/learning'
import { useSessionStore } from '@/stores/session'

import type { LearningModule } from '@/shared/contracts/learning'
import type { SceneCardViewModel } from '@/shared/types/learning'

/** 复用学习列表与探索页的数据加载、权限提示和导航逻辑 */
export const useLearningPage = () => {
  const learning = useLearningStore()
  const session = useSessionStore()
  const noticeVisible = ref(false)
  const runtime = getRuntimeServices()
  const owner = Symbol('learning-page')
  const profileActionShown = ref(session.contactGuideShown)
  /** 清理账号或学习数据时立即关闭旧提示，下一次展示重新读取会话资格 */
  watch(
    () => session.cleanupGeneration,
    () => {
      noticeVisible.value = false
      profileActionShown.value = false
    },
    { flush: 'sync' }
  )
  /** 仅实际弹出且允许资料入口时消耗本会话一次展示机会 */
  watch(
    [noticeVisible, () => learning.sections.showProfileAction],
    ([visible, allowed]) => {
      if (!visible || !allowed) return
      profileActionShown.value = session.contactGuideShown
      if (!profileActionShown.value) session.contactGuideShown = true
    },
    { flush: 'sync' }
  )

  /** 从服务端并行刷新模块入口和个性化目录 */
  const load = async () => {
    await learning.load(runtime.catalog, owner)
  }

  /** 页面离开时取消本页目录请求，保留其他页面的刷新 */
  const cancel = () => learning.cancel(owner)

  /** 有权限时进入场景，无权限时停留当前页打开统一提示。 */
  const selectScene = async (scene: SceneCardViewModel) => {
    getAnalytics().track(AnalyticsEvent.SCENE_CLICK, {
      content_scene_id: scene.sceneId,
      access_level: scene.canOpen ? 'allowed' : 'preview'
    })
    if (!scene.entryUrl) {
      if (noticeVisible.value) return
      noticeVisible.value = true
      return
    }

    await navigate({ type: NavigationType.NAVIGATE_TO, url: scene.entryUrl })
  }

  /** 关闭无权限提示并保留当前探索位置。 */
  const closeNotice = () => {
    profileActionShown.value = true
    noticeVisible.value = false
  }

  /** 进入只读探索列表。 */
  const openExplore = async () => {
    await navigate({ type: NavigationType.NAVIGATE_TO, url: '/sub-packages/learning/explore' })
  }

  /** 进入已学习场景列表，作为已有权益用户唯一开放场景复习入口。 */
  const openReview = async () => {
    await navigate({
      type: NavigationType.NAVIGATE_TO,
      url: '/sub-packages/favorites/history?filter=open'
    })
  }
  /** 无模块时仍可查看本人收藏 */
  const openFavorites = () =>
    navigate({ type: NavigationType.RE_LAUNCH, url: '/pages/favorites/index' })

  /** 从服务端允许的次级入口前往联系资料，不承诺开通内容。 */
  const openProfile = async () => {
    profileActionShown.value = true
    getAnalytics().track(AnalyticsEvent.CONTACT_ENTRY_CLICK, { entry_source: 'access_notice' })
    noticeVisible.value = false
    await navigate({
      type: NavigationType.NAVIGATE_TO,
      url: '/sub-packages/profile/contact-prompt'
    })
  }
  /** 打开启用模块，module为服务端当前返回的配置，不恢复关闭模块 */
  const selectModule = async (module: LearningModule) => {
    if (!learning.sections.modules.some((entry) => entry.public_id === module.public_id)) return
    if (module.key === 'short_reading')
      await navigate({ type: NavigationType.NAVIGATE_TO, url: '/sub-packages/short-reading/index' })
    else if (module.key !== 'scene_learning')
      uni.showToast({ icon: 'none', title: '此模块暂未开放学习内容' })
  }

  return {
    cancel,
    closeNotice,
    learning,
    load,
    noticeVisible,
    openExplore,
    openFavorites,
    openProfile,
    openReview,
    selectScene,
    selectModule,
    profileActionShown
  }
}
