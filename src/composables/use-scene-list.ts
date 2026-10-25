import { computed, ref, shallowRef } from 'vue'

import { listPageSize } from '@/services/list-page-size'

import type { SceneListPage, SceneListPorts } from '@/shared/types/learning'

/** 独立管理场景列表的首次加载、保留刷新和逐页追加
 * @param ports 列表接口、鉴权请求和进入校验
 */
export const useSceneList = <T>(ports: SceneListPorts<T>) => {
  const items = shallowRef<T[]>([]),
    total = ref<number | null>(null),
    publishedTotal = ref(0),
    accessContext = shallowRef<SceneListPage<T>['learning_access']>(null),
    freeRemaining = ref<number | null>(null),
    busy = ref(false),
    moreBusy = ref(false),
    error = ref(''),
    moreError = ref(''),
    exhausted = ref(false)
  let pages = 1,
    limit = 0,
    generation = 0,
    restartGeneration = 0,
    owner = ports.userId?.(),
    refreshing: Promise<void> | null = null,
    appending: Promise<void> | null = null
  const hasMore = computed(() => total.value !== null && !exhausted.value),
    done = computed(() => total.value !== null && total.value > 0 && exhausted.value)
  /** 按稳定卡片编号合并，重复页不会生成重复展示
   * @param values 本次可信的接口列表
   */
  const unique = (values: T[]) => [
    ...new Map(
      values.map((item) => [ports.key ? ports.key(item) : (item as { id: string }).id, item])
    ).values()
  ]
  /** 仅以已成功读取的分页边界或兼容接口的可信数量确认结束
   * @param page 最新成功页的服务端边界
   */
  const acceptBoundary = (page: SceneListPage<T>) => {
    exhausted.value =
      page.page && page.limit
        ? page.page * page.limit >= page.total
        : items.value.length >= page.total
  }
  /** 会话失效或换账号时清除私人列表并重置分页 */
  const reset = () => {
    generation++
    refreshing = null
    appending = null
    pages = 1
    limit = 0
    owner = ports.userId?.()
    items.value = []
    total.value = null
    publishedTotal.value = 0
    accessContext.value = null
    freeRemaining.value = null
    busy.value = false
    moreBusy.value = false
    error.value = ''
    moreError.value = ''
    exhausted.value = false
  }
  /** 请求前识别身份变化，旧账号的可见数据不能带入新请求 */
  const syncOwner = () => {
    if (ports.userId && owner !== ports.userId()) reset()
  }
  /** 仅当前请求代次及账号可发布内容和错误
   * @param run 请求发出时的列表代次
   */
  const current = (run: number) => run === generation && (!ports.userId || owner === ports.userId())
  /** 获取已读范围或新轮次首屏，失败时不提交新的页数和页长
   * @param firstPage 用户主动下拉时仅请求新轮次第一页
   */
  const refreshRange = async (firstPage = false) => {
    busy.value = true
    error.value = ''
    const run = ++generation
    try {
      if (!(await ports.ensure())) return
      if (!current(run)) return
      const nextLimit =
          firstPage || !limit
            ? Math.max(1, Math.min(50, Math.floor(ports.pageSize?.() ?? listPageSize())))
            : limit,
        nextPages = firstPage ? 1 : pages
      const results = await Promise.all(
        Array.from({ length: nextPages }, (_, index) =>
          ports.request<SceneListPage<T>>(`${ports.path}?page=${index + 1}&limit=${nextLimit}`)
        )
      )
      if (!current(run)) return
      limit = nextLimit
      pages = nextPages
      items.value = unique(results.flatMap((page) => page.items))
      total.value = results[0]?.total ?? 0
      publishedTotal.value = results[0]?.published_total ?? 0
      accessContext.value = results[0]?.learning_access || null
      freeRemaining.value = results[0]?.free_uncompleted_total ?? null
      moreError.value = ''
      const last = results.at(-1)
      if (last) acceptBoundary(last)
    } catch (reason) {
      if (current(run))
        error.value = reason instanceof Error ? reason.message : '列表暂未获取，请重试'
    } finally {
      if (run === generation) {
        if (!current(run)) reset()
        else busy.value = false
      }
    }
  }
  /** 合并相同账号正在进行的保留刷新，原生下拉等待真实请求结束 */
  const refresh = (): Promise<void> => {
    syncOwner()
    if (refreshing) return refreshing
    if (appending) return appending.then(refresh)
    const run = generation + 1
    refreshing = refreshRange().finally(() => {
      if (run === generation) refreshing = null
    })
    return refreshing
  }
  /** 主动下拉开启新轮次，立即拒绝旧请求，但首屏成功后才替换可信内容 */
  const restart = (): Promise<void> => {
    syncOwner()
    if (refreshing && restartGeneration === generation) return refreshing
    restartGeneration = generation + 1
    appending = null
    moreBusy.value = false
    const job = refreshRange(true).finally(() => {
      if (refreshing === job) refreshing = null
    })
    refreshing = job
    return job
  }
  /** 仅请求下一页，失败后重试同一页，不重排已展示内容 */
  const append = async () => {
    syncOwner()
    if (busy.value || moreBusy.value || !hasMore.value) return
    moreBusy.value = true
    moreError.value = ''
    const run = generation,
      page = pages + 1
    try {
      if (!(await ports.ensure())) return
      if (!current(run)) return
      const result = await ports.request<SceneListPage<T>>(
        `${ports.path}?page=${page}&limit=${limit}`
      )
      if (!current(run)) return
      items.value = unique([...items.value, ...result.items])
      total.value = result.total
      publishedTotal.value = result.published_total ?? publishedTotal.value
      accessContext.value = result.learning_access ?? accessContext.value
      freeRemaining.value = result.free_uncompleted_total ?? freeRemaining.value
      pages = page
      acceptBoundary(result)
    } catch (reason) {
      if (current(run))
        moreError.value = reason instanceof Error ? reason.message : '加载更多失败，请重试'
    } finally {
      if (run === generation) {
        if (!current(run)) reset()
        else moreBusy.value = false
      }
    }
  }
  /** 合并同一页的追加请求，使同时触发的下拉刷新能够等待它 */
  const more = (): Promise<void> => {
    syncOwner()
    if (appending) return appending
    const job = append().finally(() => {
      if (appending === job) appending = null
    })
    appending = job
    return job
  }
  /** 页面销毁或账号切换时禁止迟到结果覆盖新页面 */
  const dispose = () => {
    generation++
    refreshing = null
    appending = null
    busy.value = false
    moreBusy.value = false
  }
  return {
    items,
    total,
    publishedTotal,
    accessContext,
    freeRemaining,
    busy,
    moreBusy,
    error,
    moreError,
    hasMore,
    done,
    refresh,
    restart,
    more,
    reset,
    dispose
  }
}
