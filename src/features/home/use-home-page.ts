import { computed } from 'vue'

import { resolveTaskScene } from '@/features/home/home-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

/** 复用首页三个状态页的数据加载与导航编排。 */
export function useHomePage() {
  const home = useHomeStore()
  const learning = useLearningStore()
  const runtime = getRuntimeServices()
  const featuredScene = computed(
    () => learning.sections.openScenes[0] ?? learning.sections.currentLearning[0]
  )
  const taskScene = computed(() =>
    resolveTaskScene(home.data?.today_task ?? null, [
      ...learning.sections.currentLearning,
      ...learning.sections.openScenes,
      ...learning.sections.entitledScenes
    ])
  )
  const openSceneCount = computed(() =>
    learning.error || !home.data
      ? null
      : learning.catalog.items.filter((scene) => scene.access === 'OPEN').length
  )

  /** 并行刷新首页和目录摘要，二者失败状态各自收敛。 */
  async function load() {
    await Promise.all([home.load(runtime.home), learning.load(runtime.catalog)])
  }

  /** 打开当前今日任务；无有效任务时保持当前页面。 */
  async function startTask() {
    if (!home.view.todayTask) return
    await navigate({ type: 'navigateTo', url: home.view.todayTask.url })
  }

  /** 打开首页场景摘要，预览场景不会由该入口传入。 */
  async function openScene(scene: SceneCardViewModel) {
    if (!scene.entryUrl) return
    await navigate({ type: 'navigateTo', url: scene.entryUrl })
  }

  /** 重新加载首页并在成功后自动关闭网络错误状态。 */
  async function retry() {
    await load()
  }

  return { featuredScene, home, load, openScene, openSceneCount, retry, startTask, taskScene }
}
