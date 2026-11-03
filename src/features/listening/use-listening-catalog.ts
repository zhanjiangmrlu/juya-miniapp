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
    generation = 0,
    listCategory = '',
    homeRequest: Promise<void> | null = null
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
    homeRequest = null
    busy.value = false
    error.value = ''
    refreshing.value = false
    home.value = null
    listCategory = ''
    category.value = ''
    scrollTop.value = 0
    list.value.dispose()
    list.value = createList('')
    owner = session.userId()
  }
  const unsubscribe = onSessionExpired(reset)
  /** 对齐直达分类和分页实例，不重复请求已经选中的分类 */
  const syncCategory = () => {
    if (listCategory === category.value) return
    list.value.dispose()
    listCategory = category.value
    list.value = createList(listCategory)
    scrollTop.value = 0
  }
  /** 独立刷新分类统计，合并在途请求并拒绝旧账号的迟到响应 */
  const loadHome = (): Promise<void> => {
    if (owner !== session.userId()) reset()
    if (homeRequest) return homeRequest
    const run = generation
    busy.value = true
    error.value = ''
    const job = (async () => {
      try {
        if (!(await account.ensure(Routes.LISTENING))) return
        if (run !== generation || owner !== session.userId()) return
        const value = await getListeningHome()
        if (run === generation && owner === session.userId()) home.value = value
      } catch (reason) {
        if (run === generation && owner === session.userId())
          error.value = reason instanceof Error ? reason.message : '听读暂未获取'
      } finally {
        if (run === generation) {
          if (owner !== session.userId()) reset()
          else busy.value = false
        }
      }
    })().finally(() => {
      if (homeRequest === job) homeRequest = null
    })
    homeRequest = job
    return job
  }
  /** 鉴权后并行刷新统计与已加载分页，任一失败不阻塞另一部分展示 */
  const load = async () => {
    if (owner !== session.userId()) reset()
    syncCategory()
    await Promise.all([loadHome(), list.value.refresh()])
  }
  /** 切换分类开始该分类第一页；详情往返不调用此方法
   * @param id 当前真实分类身份，空值为全部
   */
  const select = async (id: string) => {
    if (owner !== session.userId()) reset()
    if (category.value === id && listCategory === id && list.value.total.value !== null) return
    category.value = id
    syncCategory()
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
    homeRequest = null
    busy.value = false
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
    loadHome,
    select,
    pullRefresh,
    dispose
  }
}
