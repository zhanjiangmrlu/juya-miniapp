import { computed, ref, shallowRef } from 'vue'

import { useSceneList } from '@/composables/use-scene-list'
import { onSessionExpired, session } from '@/services/api'
import { LISTENING_API } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningHome, ListeningSummary } from '@/shared/types/listening'

import { getListeningHome } from './listening-service'

/** 分类文章直达列表复用现有分页，在详情返回时保留已加载范围和滚动位置 */
export const useListeningCatalog = () => {
  const account = useAccountStore(),
    home = ref<ListeningHome | null>(null),
    category = ref(''),
    scrollTop = ref(0),
    busy = ref(false),
    error = ref(''),
    refreshing = ref(false)
  let owner = session.userId(),
    generation = 0
  /** 为指定分类建立独立分页状态
   * @param categoryId 用户选择的分类，空值为全部文章
   */
  const createList = (categoryId: string) =>
    useSceneList<ListeningSummary>({
      path: `${LISTENING_API}/articles`,
      request: (path, options) =>
        session.request(
          `${path}${categoryId ? `&category_id=${encodeURIComponent(categoryId)}` : ''}`,
          options
        ),
      userId: session.userId,
      ensure: () => account.ensure(Routes.LISTENING)
    })
  const list = shallowRef(createList(''))
  const selectedCategory = computed(() =>
    home.value?.categories.find((item) => item.id === category.value)
  )
  const articles = computed(() =>
    list.value.items.value.map((item) => {
      const resume = home.value?.continue_learning
      return resume && item.id === resume.id && item.version_id === resume.version_id
        ? { ...item, progress: resume.progress, reading_paragraph: resume.reading_paragraph }
        : item
    })
  )
  /** 身份失效即清空本人进度及列表，拒绝迟到响应 */
  const reset = () => {
    generation++
    home.value = null
    category.value = ''
    scrollTop.value = 0
    list.value.dispose()
    list.value = createList('')
    owner = session.userId()
  }
  const unsubscribe = onSessionExpired(reset)
  /** 真实刷新分类统计与已加载分页；失败明确展示，不伪造免费或进度 */
  const load = async () => {
    if (owner !== session.userId()) reset()
    const run = ++generation
    busy.value = true
    error.value = ''
    try {
      if (!(await account.ensure(Routes.LISTENING))) return
      const value = await getListeningHome()
      if (run !== generation) return
      home.value = value
      await list.value.refresh()
    } catch (reason) {
      if (run === generation)
        error.value = reason instanceof Error ? reason.message : '听读暂未获取'
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 切换分类开始该分类第一页；详情往返不调用此方法
   * @param id 当前真实分类身份，空值为全部
   */
  const select = async (id: string) => {
    if (category.value === id && list.value.total.value !== null) return
    category.value = id
    list.value.dispose()
    list.value = createList(id)
    scrollTop.value = 0
    await list.value.refresh()
  }
  /** 下拉刷新首屏并同步独立的继续学习目标 */
  const pullRefresh = async () => {
    if (refreshing.value) return
    refreshing.value = true
    try {
      await load()
    } finally {
      refreshing.value = false
    }
  }
  /** 页面离开后取消迟到列表与身份事件 */
  const dispose = () => {
    generation++
    list.value.dispose()
    unsubscribe()
  }
  return {
    home,
    category,
    scrollTop,
    busy,
    error,
    refreshing,
    selectedCategory,
    articles,
    list,
    load,
    select,
    pullRefresh,
    dispose
  }
}
