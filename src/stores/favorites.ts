import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

import { presentFavorites } from '@/features/favorites/favorite-presenter'
import { createRequestId } from '@/services/http/request-id'
import { FavoriteType } from '@/shared/enums/favorites'
import { useSessionStore } from '@/stores/session'

import type { FavoriteItem, FavoriteReference } from '@/shared/contracts/favorites'
import type {
  FavoriteService,
  FavoriteTabState,
  FavoriteTargetState
} from '@/shared/types/favorites'
export type { FavoriteTabState } from '@/shared/types/favorites'
/** 创建互相独立的银行筛选与阅读位置 */
const createTabState = (): FavoriteTabState => ({ cursor: null, filter: '', scrollTop: 0 })
export const useFavoriteStore = defineStore('favorites', () => {
  const activeTab = ref<FavoriteType>(FavoriteType.VOCABULARY)
  const items = ref<FavoriteItem[]>([])
  const loading = ref(false)
  let generation = 0
  let accountGeneration = 0
  let mutationSequence = 0
  const states = reactive<Record<string, FavoriteTargetState>>({})
  const retryKeys = new Map<string, string>()
  const operations = new Map<string, Promise<unknown>>()
  const pendingIds = ref<string[]>([])
  const mutations = new Map<string, { sequence: number; item?: FavoriteItem }>()
  /** 判断独立收藏是否正在取消，id 为银行或详情当前收藏ID */
  const isPending = (id: string) => pendingIds.value.includes(id)
  const tabState = reactive<Record<FavoriteType, FavoriteTabState>>({
    [FavoriteType.PHRASE]: createTabState(),
    [FavoriteType.VOCABULARY]: createTabState()
  })
  const visibleGroups = computed(() =>
    presentFavorites(
      items.value.filter(
        (item) =>
          item.entry_type === activeTab.value &&
          (item.english || item.normalized_key)
            .toLocaleLowerCase()
            .includes(tabState[activeTab.value].filter.toLocaleLowerCase())
      )
    )
  )
  /** 生成与版本无关的稳定目标键，reference 为服务端确认的本篇来源身份 */
  const targetKey = (reference: FavoriteReference) =>
    JSON.stringify([
      reference.content_type,
      reference.content_id,
      reference.entry_id,
      reference.sense_id,
      reference.source_id
    ])
  /** 获取可共享的真实收藏状态，reference 为当前学习卡引用 */
  const stateFor = (reference: FavoriteReference): FavoriteTargetState => {
    const key = targetKey(reference)
    return (states[key] ??= { is_favorited: false, favorite_id: null, pending: false, error: '' })
  }
  /** 写入授权详情真实状态，reference 为学习卡引用，state 为接口返回收藏身份 */
  const seedState = (
    reference: FavoriteReference,
    state: Pick<FavoriteTargetState, 'is_favorited' | 'favorite_id'>
  ) => {
    const current = stateFor(reference)
    if (!current.pending) Object.assign(current, state, { error: '' })
  }
  /** 从完整快照提取目标引用，item 为服务端固定资料 */
  const referenceFor = (item: FavoriteItem): FavoriteReference | undefined => {
    if (
      !item.content_type ||
      !item.content_id ||
      !item.entry_id ||
      !item.sense_id ||
      !item.source_id
    )
      return undefined
    return {
      content_type: item.content_type,
      content_id: item.content_id,
      content_version: item.saved_content_version || item.content_version || 1,
      entry_id: item.entry_id,
      sense_id: item.sense_id,
      source_id: item.source_id
    }
  }
  /** 从全部待复习队列移除取消的卡，id 为已无效收藏ID */
  const pruneReview = (id: string) => {
    for (const state of Object.values(tabState)) {
      const review = state.review
      const removedIndex = review?.cardIds.indexOf(id) ?? -1
      if (!review || removedIndex < 0) continue
      review.cardIds = review.cardIds.filter((card) => card !== id)
      review.index = Math.max(
        0,
        Math.min(review.index - (removedIndex < review.index ? 1 : 0), review.cardIds.length - 1)
      )
      delete review.session
      delete review.createKey
      delete review.completionKey
    }
  }
  /** 合并可信快照并同步来源状态，item 为当前账号有效收藏 */
  const remember = (item: FavoriteItem) => {
    const existing = items.value.findIndex((value) => value.id === item.id)
    if (item.active === false) {
      items.value = items.value.filter((value) => value.id !== item.id)
      pruneReview(item.id)
    } else if (existing >= 0) items.value[existing] = item
    else items.value.push(item)
    const reference = referenceFor(item)
    if (reference)
      seedState(reference, {
        is_favorited: item.active !== false,
        favorite_id: item.active === false ? null : item.id
      })
  }
  /** 引用创建收藏并固定重试键，reference 为确认目标，service 为当前账号收藏服务 */
  const create = async (reference: FavoriteReference, service: FavoriteService) => {
    const state = stateFor(reference)
    const operation = `create:${targetKey(reference)}:${reference.content_version}`
    const previous = operations.get(operation)
    if (previous) return previous as Promise<FavoriteItem>
    const epoch = accountGeneration
    const key = retryKeys.get(operation) ?? createRequestId()
    retryKeys.set(operation, key)
    state.pending = true
    state.error = ''
    /** 提交稳定引用并仅应用当前账号响应 */
    const submit = async () => {
      try {
        const item = await service.create(reference, key)
        if (epoch !== accountGeneration) return item
        state.is_favorited = item.active !== false
        state.favorite_id = item.active === false ? null : item.id
        mutations.set(item.id, {
          sequence: ++mutationSequence,
          item: item.active === false ? undefined : item
        })
        remember(item)
        retryKeys.delete(operation)
        return item
      } catch (error) {
        if (epoch === accountGeneration)
          state.error =
            (error as { code?: string }).code === 'CONTENT_VERSION_CONFLICT'
              ? '内容已更新，请重新加载后收藏'
              : '收藏失败，请重试'
        throw error
      } finally {
        if (epoch === accountGeneration) {
          state.pending = false
          operations.delete(operation)
        }
      }
    }
    const request = submit()
    operations.set(operation, request)
    return request
  }
  /** 幂等取消本人独立收藏，id 为选中卡ID，service 为当前账号收藏接口 */
  const remove = async (id: string, service: FavoriteService) => {
    const operation = `remove:${id}`
    const previous = operations.get(operation)
    if (previous) return previous
    const epoch = accountGeneration
    const key = retryKeys.get(operation) ?? createRequestId()
    retryKeys.set(operation, key)
    const linked = Object.values(states).filter((state) => state.favorite_id === id)
    pendingIds.value.push(id)
    for (const state of linked) Object.assign(state, { pending: true, error: '' })
    /** 应用服务端取消结果并同步队列 */
    const submit = async () => {
      try {
        const result = await service.remove(id, key)
        if (epoch !== accountGeneration) return result
        if (result.favorite_id !== id || result.active) throw new Error('取消收藏状态未确认')
        mutations.set(id, { sequence: ++mutationSequence })
        items.value = items.value.filter((item) => item.id !== id)
        pruneReview(id)
        for (const state of linked) Object.assign(state, { is_favorited: false, favorite_id: null })
        retryKeys.delete(operation)
        return result
      } catch (error) {
        if (epoch === accountGeneration)
          for (const state of linked) state.error = '取消收藏失败，请重试'
        throw error
      } finally {
        if (epoch === accountGeneration) {
          for (const state of linked) state.pending = false
          pendingIds.value = pendingIds.value.filter((value) => value !== id)
          operations.delete(operation)
        }
      }
    }
    const request = submit()
    operations.set(operation, request)
    return request
  }
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
    const startedSequence = mutationSequence
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
        cursor = page.has_more ? page.next_cursor : null
        if (page.has_more && !cursor) throw new Error('收藏分页缺少游标，请重试')
      } while (cursor)
      const merged = new Map(
        collected.filter((item) => item.active !== false).map((item) => [item.id, item])
      )
      for (const [id, mutation] of mutations) {
        if (mutation.sequence <= startedSequence) continue
        if (mutation.item) merged.set(id, mutation.item)
        else merged.delete(id)
      }
      items.value = [...merged.values()]
      for (const item of items.value) {
        const reference = referenceFor(item)
        if (reference) seedState(reference, { is_favorited: true, favorite_id: item.id })
      }
      for (const state of Object.values(states)) {
        if (state.favorite_id && !merged.has(state.favorite_id) && !state.pending)
          Object.assign(state, { is_favorited: false, favorite_id: null })
      }
      for (const state of Object.values(tabState))
        for (const id of [...(state.review?.cardIds || [])]) if (!merged.has(id)) pruneReview(id)
      state.cursor = cursor
    } finally {
      if (current === generation) loading.value = false
    }
  }
  /** 清空学习缓存时移除收藏与银行状态 */
  const clear = () => {
    generation++
    accountGeneration++
    mutationSequence = 0
    mutations.clear()
    retryKeys.clear()
    operations.clear()
    pendingIds.value = []
    for (const key of Object.keys(states)) delete states[key]
    activeTab.value = FavoriteType.VOCABULARY
    items.value = []
    loading.value = false
    delete tabState[FavoriteType.PHRASE].review
    delete tabState[FavoriteType.VOCABULARY].review
    Object.assign(tabState[FavoriteType.PHRASE], createTabState())
    Object.assign(tabState[FavoriteType.VOCABULARY], createTabState())
  }
  watch(() => useSessionStore().cleanupGeneration, clear, { flush: 'sync' })
  return {
    activeTab,
    create,
    clear,
    items,
    isPending,
    load,
    loading,
    remember,
    remove,
    seedState,
    stateFor,
    selectTab,
    tabState,
    updateTabState,
    visibleGroups
  }
})
