import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { onBeforeUnmount, ref, watch } from 'vue'

import { isShortReadingDenied } from '@/features/short-reading/short-reading-controller'
import { ApiError } from '@/services/http/errors'
import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'
import { useSessionStore } from '@/stores/session'

import type { ShortReadingHistoryItem } from '@/shared/contracts/short-reading'
import type { HttpStatusCarrier } from '@/shared/types/http'

/** 独立读取本人阅读历史和总数，不依赖当前可访问短文目录或场景统计 */
export const useShortReadingHistory = () => {
  const runtime = getRuntimeServices()
  const session = useSessionStore()
  const items = ref<ShortReadingHistoryItem[]>([])
  const startedCount = ref<number>()
  const completedCount = ref<number>()
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')
  const openingId = ref<string | null>(null)
  let generation = 0
  let visible = true
  const visited = new Set<string>()
  /** 清除已失效身份的历史及正文入口，不把未知总数当零 */
  const reset = () => {
    items.value = []
    startedCount.value = undefined
    completedCount.value = undefined
    nextCursor.value = null
    visited.clear()
  }
  /** 失效所有在途页，保留当前实际页面可见性供本人主动重试 */
  const invalidate = () => {
    generation++
    reset()
    loading.value = false
    error.value = ''
    notice.value = ''
    openingId.value = null
  }
  /** 读取本人历史，append表示按服务端游标追加，网络失败保留已确认摘要供原位重试 */
  const load = async (append = false) => {
    if (!visible || loading.value || (append && !nextCursor.value)) return
    const request = ++generation
    const cursor = append ? (nextCursor.value ?? undefined) : undefined
    loading.value = true
    error.value = ''
    notice.value = ''
    openingId.value = null
    if (!append) reset()
    try {
      const page = await runtime.shortReading.history(cursor)
      if (!visible || request !== generation) return
      if (
        page.has_more &&
        (!page.next_cursor || page.next_cursor === cursor || visited.has(page.next_cursor))
      )
        throw new ApiError('CURSOR_INVALID', '阅读记录分页位置已失效', 422)
      const known = new Map((append ? items.value : []).map((item) => [item.content_id, item]))
      for (const item of page.items)
        if (!known.has(item.content_id)) known.set(item.content_id, item)
      items.value = [...known.values()]
      startedCount.value = page.started_count
      completedCount.value = page.completed_count
      nextCursor.value = page.has_more ? page.next_cursor : null
      if (cursor) visited.add(cursor)
    } catch (failure) {
      if (!visible || request !== generation) return
      const cursorInvalid =
        (failure as { code?: string }).code === 'CURSOR_INVALID' ||
        (failure as HttpStatusCarrier)?.status === 422
      if (cursorInvalid || isShortReadingDenied(failure)) reset()
      error.value = cursorInvalid
        ? '阅读记录分页位置已失效，请重新加载'
        : '阅读记录加载失败，请重试'
    } finally {
      if (visible && request === generation) loading.value = false
    }
  }
  /** item为本人许可摘要；无权先核对安全预览存在，下线记录仍保留本页标题和完成状态 */
  const open = async (item: ShortReadingHistoryItem) => {
    const current = items.value.find((record) => record.content_id === item.content_id)
    if (!visible || !current || openingId.value) return
    const request = generation
    const isCurrent = () => visible && request === generation && items.value.includes(current)
    notice.value = ''
    if (!current.can_open) {
      openingId.value = current.content_id
      try {
        await runtime.shortReading.preview(current.content_id)
      } catch (failure) {
        if (isCurrent())
          notice.value =
            (failure as HttpStatusCarrier)?.status === 404
              ? '短文已下线，阅读记录已保留'
              : '安全预览暂不可用，阅读记录已保留，请稍后重试'
        return
      } finally {
        if (isCurrent()) openingId.value = null
      }
    }
    if (!isCurrent()) return
    return navigate({
      type: NavigationType.NAVIGATE_TO,
      url: `/sub-packages/short-reading/${current.can_open ? 'detail' : 'preview'}?contentId=${encodeURIComponent(current.content_id)}`
    })
  }
  /** 离页时失效请求，迟到结果不得恢复历史标题或可打开入口 */
  const leave = () => {
    visible = false
    invalidate()
  }
  watch(
    () => [session.isAuthenticated, session.profile?.juya_id, session.cleanupGeneration],
    (current, previous) => {
      invalidate()
      if (!visible || !session.isAuthenticated || !session.profile?.juya_id) return
      if (current[0] !== previous[0] || current[1] !== previous[1]) void load()
      else error.value = '阅读记录已更新，请重新加载'
    },
    { flush: 'sync' }
  )
  onShow(() => {
    visible = true
    void load()
  })
  onHide(leave)
  onUnload(leave)
  onBeforeUnmount(leave)
  return {
    items,
    startedCount,
    completedCount,
    nextCursor,
    loading,
    error,
    notice,
    openingId,
    load,
    open
  }
}
