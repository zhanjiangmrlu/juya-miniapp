import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { onBeforeUnmount, ref, watch } from 'vue'

import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { ShortReadingAccess, ShortReadingKind } from '@/shared/enums/short-reading'
import { navigate } from '@/shared/navigation/navigate'
import { useSessionStore } from '@/stores/session'

import type { ShortReadingSummary } from '@/shared/contracts/short-reading'

/** 读取已开放模块的安全短文列表，后台顺序与分页游标均原样保留 */
export const useShortReadingList = () => {
  const runtime = getRuntimeServices()
  const session = useSessionStore()
  const items = ref<ShortReadingSummary[]>([])
  const loading = ref(false)
  const unavailable = ref(false)
  const nextCursor = ref<string | null>()
  let request = 0

  /** 页面离开时取消迟到列表并清空账号相关摘要 */
  const clear = () => {
    request++
    items.value = []
    nextCursor.value = null
    loading.value = false
  }
  /** 每页读取前检查模块，append 表示使用服务端游标追加下一页 */
  const load = async (append = false) => {
    if (loading.value || (append && !nextCursor.value)) return
    const current = ++request
    const cursor = append ? (nextCursor.value ?? undefined) : undefined
    loading.value = true
    unavailable.value = false
    if (!append) {
      items.value = []
      nextCursor.value = null
    }
    try {
      const modules = await runtime.catalog.getModules()
      if (current !== request) return
      if (!modules.items.some((item) => item.key === ShortReadingKind.CONTENT && item.enabled)) {
        items.value = []
        nextCursor.value = null
        unavailable.value = true
        return
      }
      const result = await runtime.shortReading.list(cursor)
      if (current !== request) return
      items.value = append ? [...items.value, ...result.items] : result.items
      nextCursor.value = result.has_more ? result.next_cursor : null
    } catch {
      if (current !== request) return
      items.value = []
      nextCursor.value = null
      unavailable.value = true
    } finally {
      if (current === request) loading.value = false
    }
  }
  /** 跳转已授权正文或安全预览，item 为服务端安全摘要 */
  const open = (item: ShortReadingSummary) => {
    const readable: string[] = [
      ShortReadingAccess.TRIAL,
      ShortReadingAccess.FORMAL,
      ShortReadingAccess.LIMITED
    ]
    const canRead = readable.includes(item.access)
    return navigate({
      type: NavigationType.NAVIGATE_TO,
      url: `/sub-packages/short-reading/${canRead ? 'detail' : 'preview'}?contentId=${encodeURIComponent(item.content_id)}`
    })
  }

  /** 每次重新显示核对当前模块和账号权限 */
  const show = () => {
    void load()
  }
  watch(
    () => [session.isAuthenticated, session.profile?.juya_id, session.cleanupGeneration] as const,
    ([authenticated, user, cleanup], [previousAuthenticated, previousUser, previousCleanup]) => {
      if (
        cleanup !== previousCleanup ||
        (previousAuthenticated && !authenticated) ||
        (previousUser && previousUser !== user)
      ) {
        clear()
        unavailable.value = true
      }
    },
    { flush: 'sync' }
  )
  onShow(show)
  onHide(clear)
  onUnload(clear)
  onBeforeUnmount(clear)
  return { items, load, loading, nextCursor, open, unavailable }
}
