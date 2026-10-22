import { computed, ref, shallowRef } from 'vue'

import type { SceneListPage, SceneListPorts } from '@/shared/types/learning'

/** 独立管理场景列表的首次加载、保留刷新和逐页追加
 * @param ports 列表接口、鉴权请求和进入校验
 */
export const useSceneList = <T extends { id: string }>(ports: SceneListPorts) => {
  const items = shallowRef<T[]>([]),
    total = ref<number | null>(null),
    publishedTotal = ref(0),
    busy = ref(false),
    moreBusy = ref(false),
    error = ref(''),
    moreError = ref(''),
    exhausted = ref(false)
  let pages = 1,
    generation = 0,
    owner = ports.userId?.()
  const hasMore = computed(() => total.value !== null && !exhausted.value),
    done = computed(() => total.value !== null && total.value > 0 && exhausted.value)
  /** 按稳定卡片编号合并，重复页不会生成重复展示
   * @param values 本次可信的接口列表
   */
  const unique = (values: T[]) => [...new Map(values.map((item) => [item.id, item])).values()]
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
    pages = 1
    owner = ports.userId?.()
    items.value = []
    total.value = null
    publishedTotal.value = 0
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
  /** 刷新已读范围，失败保留最后可信列表和高度 */
  const refresh = async () => {
    syncOwner()
    if (busy.value || moreBusy.value) return
    busy.value = true
    error.value = ''
    const run = ++generation
    try {
      if (!(await ports.ensure())) return
      if (run !== generation) return
      owner = ports.userId?.()
      const results = await Promise.all(
        Array.from({ length: pages }, (_, index) =>
          ports.request<SceneListPage<T>>(`${ports.path}?page=${index + 1}&limit=20`)
        )
      )
      if (run !== generation || (ports.userId && owner !== ports.userId())) return
      items.value = unique(results.flatMap((page) => page.items))
      total.value = results[0]?.total ?? 0
      publishedTotal.value = results[0]?.published_total ?? 0
      moreError.value = ''
      const last = results.at(-1)
      if (last) acceptBoundary(last)
    } catch (reason) {
      if (run === generation)
        error.value = reason instanceof Error ? reason.message : '列表暂未获取，请重试'
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 仅请求下一页，失败后重试同一页，不重排已展示内容 */
  const more = async () => {
    syncOwner()
    if (busy.value || moreBusy.value || !hasMore.value) return
    moreBusy.value = true
    moreError.value = ''
    const run = generation,
      page = pages + 1
    try {
      if (!(await ports.ensure())) return
      if (run !== generation) return
      const result = await ports.request<SceneListPage<T>>(`${ports.path}?page=${page}&limit=20`)
      if (run !== generation || (ports.userId && owner !== ports.userId())) return
      items.value = unique([...items.value, ...result.items])
      total.value = result.total
      publishedTotal.value = result.published_total ?? publishedTotal.value
      pages = page
      acceptBoundary(result)
    } catch (reason) {
      if (run === generation)
        moreError.value = reason instanceof Error ? reason.message : '加载更多失败，请重试'
    } finally {
      if (run === generation) moreBusy.value = false
    }
  }
  /** 页面销毁或账号切换时禁止迟到结果覆盖新页面 */
  const dispose = () => {
    generation++
    busy.value = false
    moreBusy.value = false
  }
  return {
    items,
    total,
    publishedTotal,
    busy,
    moreBusy,
    error,
    moreError,
    hasMore,
    done,
    refresh,
    more,
    reset,
    dispose
  }
}
