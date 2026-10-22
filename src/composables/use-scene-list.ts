import { ref, shallowRef } from 'vue'

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
    moreError = ref('')
  let pages = 1,
    generation = 0
  /** 按稳定卡片编号合并，重复页不会生成重复展示
   * @param values 本次可信的接口列表
   */
  const unique = (values: T[]) => [...new Map(values.map((item) => [item.id, item])).values()]
  /** 刷新已读范围，失败保留最后可信列表和高度 */
  const refresh = async () => {
    if (busy.value || moreBusy.value) return
    busy.value = true
    error.value = ''
    moreError.value = ''
    const run = ++generation
    try {
      if (!(await ports.ensure())) return
      const results = await Promise.all(
        Array.from({ length: pages }, (_, index) =>
          ports.request<SceneListPage<T>>(`${ports.path}?page=${index + 1}&limit=20`)
        )
      )
      if (run !== generation) return
      items.value = unique(results.flatMap((page) => page.items))
      total.value = results[0]?.total ?? 0
      publishedTotal.value = results[0]?.published_total ?? 0
    } catch (reason) {
      if (run === generation)
        error.value = reason instanceof Error ? reason.message : '列表暂未获取，请重试'
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 仅请求下一页，失败后重试同一页，不重排已展示内容 */
  const more = async () => {
    if (busy.value || moreBusy.value || total.value === null || items.value.length >= total.value)
      return
    moreBusy.value = true
    moreError.value = ''
    const run = generation,
      page = pages + 1
    try {
      if (!(await ports.ensure())) return
      const result = await ports.request<SceneListPage<T>>(`${ports.path}?page=${page}&limit=20`)
      if (run !== generation) return
      items.value = unique([...items.value, ...result.items])
      total.value = result.total
      publishedTotal.value = result.published_total ?? publishedTotal.value
      pages = page
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
  return { items, total, publishedTotal, busy, moreBusy, error, moreError, refresh, more, dispose }
}
