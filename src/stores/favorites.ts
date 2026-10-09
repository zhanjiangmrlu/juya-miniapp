import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { presentFavorites } from '@/features/favorites/favorite-presenter'
import { FavoriteType } from '@/shared/enums/favorites'

import type { FavoriteItem } from '@/shared/contracts/favorites'
import type { FavoriteService, FavoriteTabState } from '@/shared/types/favorites'
export type { FavoriteTabState } from '@/shared/types/favorites'
/** 创建互相独立的银行筛选与阅读位置 */
const createTabState = (): FavoriteTabState => ({ cursor: null, filter: '', scrollTop: 0 })
export const useFavoriteStore = defineStore('favorites', () => {
  const activeTab = ref<FavoriteType>(FavoriteType.VOCABULARY)
  const items = ref<FavoriteItem[]>([])
  const loading = ref(false)
  let generation = 0
  const tabState = reactive<Record<FavoriteType, FavoriteTabState>>({
    [FavoriteType.PHRASE]: createTabState(),
    [FavoriteType.VOCABULARY]: createTabState()
  })
  const visibleGroups = computed(() =>
    presentFavorites(
      items.value.filter(
        (item) =>
          item.entry_type === activeTab.value &&
          item.normalized_key
            .toLocaleLowerCase()
            .includes(tabState[activeTab.value].filter.toLocaleLowerCase())
      )
    )
  )
  /** 更新银行状态，type 为收藏类型，next 为需要保存的筛选或阅读位置 */
  const updateTabState = (type: FavoriteType, next: Partial<FavoriteTabState>) => {
    Object.assign(tabState[type], next)
  }
  /** 切换银行，type 为目标收藏类型 */
  const selectTab = (type: FavoriteType) => {
    activeTab.value = type
  }
  /** 加载全部游标页供不限量复习，service 为收藏接口，reset 为是否刷新完整列表 */
  const load = async (service: FavoriteService, reset = false) => {
    if (loading.value) return
    const current = ++generation
    loading.value = true
    const type = activeTab.value
    const state = tabState[type]
    let cursor = reset ? null : state.cursor
    const collected = reset ? [] : [...items.value]
    const known = new Set(collected.map((item) => item.id))
    const visited = new Set<string>()
    try {
      do {
        if (cursor && visited.has(cursor)) throw new Error('收藏分页游标重复，请重试')
        if (cursor) visited.add(cursor)
        const page = await service.list(cursor ?? undefined)
        if (current !== generation) return
        for (const item of page.items) {
          if (!known.has(item.id)) {
            collected.push(item)
            known.add(item.id)
          }
        }
        cursor = page.next_cursor
      } while (cursor)
      items.value = collected
      state.cursor = cursor
    } finally {
      if (current === generation) loading.value = false
    }
  }
  /** 清空学习缓存时移除收藏与银行状态 */
  const clear = () => {
    generation++
    activeTab.value = FavoriteType.VOCABULARY
    items.value = []
    loading.value = false
    delete tabState[FavoriteType.PHRASE].review
    delete tabState[FavoriteType.VOCABULARY].review
    Object.assign(tabState[FavoriteType.PHRASE], createTabState())
    Object.assign(tabState[FavoriteType.VOCABULARY], createTabState())
  }
  return {
    activeTab,
    clear,
    items,
    load,
    loading,
    selectTab,
    tabState,
    updateTabState,
    visibleGroups
  }
})
