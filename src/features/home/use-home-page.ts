import { computed } from 'vue'

import { resolveTaskScene } from '@/features/home/home-presenter'
import { presentCatalog } from '@/features/learning/catalog-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { ensureSession } from '@/services/startup'
import { navigate } from '@/shared/navigation/navigate'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

/** 复用首页状态页的数据加载与导航编排 */
export const useHomePage = () => {
  const home = useHomeStore()
  const learning = useLearningStore()
  const runtime = getRuntimeServices()
  const owner = Symbol('home-page')
  let generation = 0
  const featuredScene = computed(
    () => learning.sections.openScenes[0] ?? learning.sections.currentLearning[0]
  )
  const taskScene = computed(() =>
    learning.catalog.authorization_pending
      ? undefined
      : resolveTaskScene(home.data?.today_task ?? null, [
          ...learning.sections.currentLearning,
          ...learning.sections.openScenes,
          ...learning.sections.entitledScenes,
          ...presentCatalog({
            catalog: {
              ...learning.catalog,
              items: learning.catalog.items.filter((scene) => scene.access === 'OPEN')
            },
            modules: learning.modules
          }).openScenes
        ])
  )
  const canStartTask = computed(() =>
    Boolean(
      home.view.todayTask && (home.data?.today_task?.kind === 'FAVORITE_REVIEW' || taskScene.value)
    )
  )
  const openSceneCount = computed(() =>
    learning.error || !home.data
      ? null
      : learning.catalog.items.filter((scene) => scene.access === 'OPEN').length
  )

  /** 建立身份后刷新首页，forceWechat 表示网络重连时重新静默登录 */
  const load = async (forceWechat = false) => {
    const request = ++generation
    const ready = await ensureSession(forceWechat)
    if (request !== generation) return
    if (!ready) {
      home.clear()
      learning.clear()
      home.error = true
      return
    }
    await Promise.all([home.load(runtime.home, owner), learning.load(runtime.catalog, owner)])
  }

  /** 页面离开时取消本页请求，保留其他页面正在刷新及已缓存的数据 */
  const cancel = () => {
    generation++
    home.cancel(owner)
    learning.cancel(owner)
  }

  /** 打开真实今日任务，场景权限待确认或已失效时保持当前页面 */
  const startTask = async () => {
    if (!canStartTask.value || !home.view.todayTask) return
    await navigate({ type: 'navigateTo', url: home.view.todayTask.url })
  }

  /** 打开可访问摘要，scene 为当前用户可学习的场景卡片 */
  const openScene = async (scene: SceneCardViewModel) => {
    if (!scene.entryUrl) return
    await navigate({ type: 'navigateTo', url: scene.entryUrl })
  }

  /** 在当前页重新静默登录并加载任务 */
  const retry = async () => {
    await load(true)
  }

  return {
    cancel,
    canStartTask,
    featuredScene,
    home,
    load,
    openScene,
    openSceneCount,
    retry,
    startTask,
    taskScene
  }
}
