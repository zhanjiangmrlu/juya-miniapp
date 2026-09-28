import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { presentFavorites } from '@/features/favorites/favorite-presenter'

import type { FavoriteService } from '@/features/favorites/favorite-service'
import type { FavoriteItem, FavoriteType } from '@/shared/contracts/favorites'

export interface FavoriteTabState {
  cursor: string | null
  filter: string
  scrollTop: number
}

/** 创建标签独立状态，防止对象引用在两个银行之间共享。 */
function createTabState(): FavoriteTabState {
  return { cursor: null, filter: '', scrollTop: 0 }
}

export const useFavoriteStore = defineStore('favorites', () => {
  const activeTab = ref<FavoriteType>('VOCABULARY')
  const items = ref<FavoriteItem[]>([])
  const loading = ref(false)
  const tabState = reactive<Record<FavoriteType, FavoriteTabState>>({
    PHRASE: createTabState(),
    VOCABULARY: createTabState()
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

  /** 局部更新指定银行状态，不触碰另一标签的筛选、位置或游标。 */
  function updateTabState(type: FavoriteType, next: Partial<FavoriteTabState>) {
    Object.assign(tabState[type], next)
  }

  /** 切换银行并保留双方独立状态。 */
  function selectTab(type: FavoriteType) {
    activeTab.value = type
  }

  /** 从当前标签游标读取下一页并按标识去重追加。 */
  async function load(service: FavoriteService, reset = false) {
    loading.value = true
    const state = tabState[activeTab.value]
    if (reset) {
      state.cursor = null
      items.value = items.value.filter((item) => item.entry_type !== activeTab.value)
    }

    try {
      const page = await service.list(state.cursor ?? undefined)
      const known = new Set(items.value.map((item) => item.id))
      items.value.push(...page.items.filter((item) => !known.has(item.id)))
      state.cursor = page.next_cursor
    } finally {
      loading.value = false
    }
  }

  /** 清空收藏与复习页面缓存，等待服务端重新读取空数据。 */
  function clear() {
    activeTab.value = 'VOCABULARY'
    items.value = []
    loading.value = false
    Object.assign(tabState.PHRASE, createTabState())
    Object.assign(tabState.VOCABULARY, createTabState())
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
