import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import { getRuntimeServices } from '@/services/runtime'
import { useFavoriteStore } from '@/stores/favorites'
import { useSessionStore } from '@/stores/session'

import type { FavoriteItem } from '@/shared/contracts/favorites'
import type { FavoriteGroup } from '@/shared/types/favorites'

import { loadFavoriteGroup } from './load-favorite-group'

/** 页面显示时读取独立收藏快照，message 为读取失败时的页面提示 */
export const useFavoriteGroup = (message: string) => {
  const item = ref<FavoriteItem>()
  const group = ref<FavoriteGroup>()
  const error = ref('')
  const favorites = useFavoriteStore()
  const session = useSessionStore()
  let id = ''
  let visible = false
  let generation = 0
  /** 移除旧权限入口，避免刷新中或失败后沿用上次正文访问能力 */
  const reset = () => {
    item.value = undefined
    group.value = undefined
  }
  /** 刷新当前收藏，只有仍可见的本次页面请求可以更新状态 */
  const load = async () => {
    const current = ++generation
    reset()
    error.value = ''
    if (!id) return
    try {
      const loaded = await loadFavoriteGroup(getRuntimeServices().favorites, id)
      if (!visible || current !== generation) return
      if (!favorites.remember(loaded.item)) {
        error.value = '收藏已取消或更新，请返回银行重新进入'
        return
      }
      item.value = loaded.item
      group.value = loaded.group
    } catch {
      if (visible && current === generation) error.value = message
    }
  }
  /** 隐藏或销毁页面时取消旧响应并移除旧权限入口 */
  const leave = () => {
    visible = false
    generation++
    reset()
  }
  /** 登出或清空学习数据后立即失效读取，避免旧快照重新写入收藏 */
  watch(
    () => session.cleanupGeneration,
    () => {
      generation++
      reset()
      error.value = ''
    },
    { flush: 'sync' }
  )
  /** 捕获当前收藏路由标识，query 为页面入口参数 */
  onLoad((query) => {
    id = query?.id || ''
  })
  /** 每次重新显示页面时读取完整最新收藏 */
  onShow(async () => {
    visible = true
    await load()
  })
  onHide(leave)
  onUnload(leave)
  return { item, group, error }
}
