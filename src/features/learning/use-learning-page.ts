import { ref } from 'vue'

import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useLearningStore } from '@/stores/learning'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

/** 复用学习列表与探索页的数据加载、权限提示和导航逻辑 */
export const useLearningPage = () => {
  const learning = useLearningStore()
  const noticeVisible = ref(false)
  const runtime = getRuntimeServices()
  const owner = Symbol('learning-page')

  /** 从服务端并行刷新模块入口和个性化目录 */
  const load = async () => {
    await learning.load(runtime.catalog, owner)
  }

  /** 页面离开时取消本页目录请求，保留其他页面的刷新 */
  const cancel = () => learning.cancel(owner)

  /** 有权限时进入场景，无权限时停留当前页打开统一提示。 */
  async function selectScene(scene: SceneCardViewModel) {
    if (!scene.entryUrl) {
      noticeVisible.value = true
      return
    }

    await navigate({ type: 'navigateTo', url: scene.entryUrl })
  }

  /** 关闭无权限提示并保留当前探索位置。 */
  function closeNotice() {
    noticeVisible.value = false
  }

  /** 进入只读探索列表。 */
  async function openExplore() {
    await navigate({ type: 'navigateTo', url: '/sub-packages/learning/explore' })
  }

  /** 进入已学习场景列表，作为已有权益用户唯一开放场景复习入口。 */
  async function openReview() {
    await navigate({ type: 'navigateTo', url: '/sub-packages/favorites/history?filter=open' })
  }

  /** 从服务端允许的次级入口前往联系资料，不承诺开通内容。 */
  async function openProfile() {
    noticeVisible.value = false
    await navigate({ type: 'navigateTo', url: '/sub-packages/profile/contact-prompt' })
  }

  return {
    cancel,
    closeNotice,
    learning,
    load,
    noticeVisible,
    openExplore,
    openProfile,
    openReview,
    selectScene
  }
}
