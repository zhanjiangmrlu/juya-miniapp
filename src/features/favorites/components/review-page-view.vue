<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import ReviewCard from '@/features/favorites/components/review-card.vue'
import { createReviewSession } from '@/features/favorites/review-session'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import { getAnalytics } from '@/services/analytics/runtime'
import { createRequestId } from '@/services/http/request-id'
import { getRuntimeServices } from '@/services/runtime'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { FavoriteType, ReviewCardFace } from '@/shared/enums/favorites'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileTabKey } from '@/shared/enums/profile'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'
import { useFavoriteStore } from '@/stores/favorites'

import type { FavoriteItem, ReviewSession } from '@/shared/contracts/favorites'
import type { ReviewPageViewProps } from '@/shared/types/favorites-components'
const props = defineProps<ReviewPageViewProps>()
const favorites = useFavoriteStore()
const bank = ref<FavoriteType>(FavoriteType.VOCABULARY)
const cardIds = ref<string[]>([])
const index = ref(0)
const item = ref<FavoriteItem>()
const error = ref('')
const busy = ref(false)
let controller: ReturnType<typeof createReviewSession>
let createKey = ''
let apiSession: ReviewSession | undefined
let generation = 0
let suspended = false
let lastQuery: Record<string, string> | undefined
const nextLabel = computed(() => (index.value < cardIds.value.length - 1 ? '下一个' : '完成复习'))
/** 同步取消后的有效队列，review 为当前银行保存的复习进度 */
watch(
  () => favorites.tabState[bank.value].review,
  (review) => {
    if (!review) return
    cardIds.value = [...review.cardIds]
    index.value = review.index
    apiSession = review.session
    const cached = favorites.items.find((card) => card.id === review.cardIds[review.index])
    if (cached) item.value = cached
    else if (!review.cardIds.includes(item.value?.id || '')) item.value = undefined
  },
  { deep: true }
)
/** 从路由恢复队列并读取真实词卡，query 为卡片标识与当前位置 */
const load = async (query?: Record<string, string>) => {
  const request = ++generation
  const token = getAnalytics().capture()
  lastQuery = query
  suspended = false
  error.value = ''
  item.value = undefined
  bank.value = query?.bank === FavoriteType.PHRASE ? FavoriteType.PHRASE : FavoriteType.VOCABULARY
  cardIds.value =
    query?.cardIds?.split(',').filter(Boolean) ??
    (query?.id ? [query.id] : favorites.tabState[bank.value].review?.cardIds || [])
  index.value = Math.max(0, Math.min(Number(query?.index || 0) || 0, cardIds.value.length - 1))
  const previous = favorites.tabState[bank.value].review
  const sameQueue = previous?.cardIds.join(',') === cardIds.value.join(',')
  const completionKey =
    sameQueue && previous?.completionKey ? previous.completionKey : createRequestId()
  createKey = sameQueue && previous?.createKey ? previous.createKey : createRequestId()
  apiSession = sameQueue ? previous?.session : undefined
  controller = createReviewSession(cardIds.value, { idFactory: () => completionKey })
  favorites.updateTabState(bank.value, {
    review: {
      cardIds: [...cardIds.value],
      index: index.value,
      face: props.face,
      session: apiSession,
      completionKey,
      createKey
    }
  })
  try {
    const service = getRuntimeServices().favorites
    // 首页与成果入口只带ID时先分页预取完整快照；已初始化队列翻面复用资料
    const missing = cardIds.value.some((id) => !favorites.items.some((card) => card.id === id))
    if (missing && typeof service.list === 'function') {
      await favorites.load(service, true)
      if (request !== generation || suspended) return
      const review = favorites.tabState[bank.value].review
      if (review) {
        cardIds.value = [...review.cardIds]
        index.value = review.index
        if (!review.createKey) {
          createKey = createRequestId()
          const nextCompletionKey = createRequestId()
          controller = createReviewSession(cardIds.value, { idFactory: () => nextCompletionKey })
          favorites.updateTabState(bank.value, {
            review: { ...review, createKey, completionKey: nextCompletionKey }
          })
        }
      }
    }
    const id = cardIds.value[index.value]
    if (id) {
      const loaded =
        favorites.items.find((card) => card.id === id && card.active !== false) ??
        (await service.get(id))
      if (request !== generation || suspended) return
      if (loaded.active === false) throw new Error('收藏已取消')
      favorites.remember(loaded)
      const created = !apiSession
      apiSession ??= await service.createReview(cardIds.value, createKey)
      if (request !== generation || suspended) return
      favorites.updateTabState(bank.value, {
        review: { ...favorites.tabState[bank.value].review!, session: apiSession }
      })
      item.value = loaded
      if (created)
        getAnalytics().track(
          AnalyticsEvent.REVIEW_START_SUCCESS,
          { entry_type: bank.value },
          { token, once: createKey }
        )
    }
  } catch {
    if (request === generation && !suspended) error.value = '复习加载失败，请返回收藏重试'
  }
}
/** 导航到指定卡面，page 为正面或背面页，position 为队列中的位置 */
const go = (page: string, position: number) =>
  navigate({
    type: NavigationType.REDIRECT_TO,
    url: `/sub-packages/favorites/${page}?index=${position}&bank=${bank.value}`
  })
/** 明确点击卡片或翻面按钮时切换卡面 */
const flip = () => {
  if (!item.value || !cardIds.value.includes(item.value.id)) return
  return go(props.face === ReviewCardFace.FRONT ? 'review-back' : 'review-front', index.value)
}
/** 恢复当前卡正面重新查看，保持本次复习队列与进度 */
const again = () => {
  if (props.face === ReviewCardFace.BACK) return go('review-front', index.value)
}
/** 完成全部卡片后记录一次复习，失败重试复用已创建会话与固定幂等键 */
const next = async () => {
  const token = getAnalytics().capture()
  const request = generation
  if (busy.value || !item.value) return
  if (index.value < cardIds.value.length - 1) {
    await go('review-front', index.value + 1)
    return
  }
  busy.value = true
  try {
    const service = getRuntimeServices().favorites
    const review = favorites.tabState[bank.value].review
    if (!review?.cardIds.includes(item.value.id)) return
    createKey = review.createKey || createRequestId()
    const completionKey = review.completionKey || createRequestId()
    controller = createReviewSession(cardIds.value, { idFactory: () => completionKey })
    favorites.updateTabState(bank.value, { review: { ...review, createKey, completionKey } })
    apiSession ??= await service.createReview(cardIds.value, createKey)
    if (request !== generation || suspended) return
    favorites.updateTabState(bank.value, {
      review: { ...favorites.tabState[bank.value].review!, session: apiSession }
    })
    await controller.complete((key) => service.completeReview(apiSession!.id, key))
    if (request !== generation || suspended) return
    getAnalytics().track(
      AnalyticsEvent.REVIEW_COMPLETE_SUCCESS,
      { entry_type: bank.value },
      {
        token,
        once: favorites.tabState[bank.value].review!.completionKey
      }
    )
    favorites.updateTabState(bank.value, { review: null })
    await navigate({ type: NavigationType.RE_LAUNCH, url: '/pages/home/index' })
  } catch {
    error.value = '复习记录提交失败，请重试'
  } finally {
    busy.value = false
  }
}
onLoad(load)
/** 隐藏复习页面时使旧加载或完成回调失效 */
const hide = () => {
  suspended = true
  generation++
}
onHide(hide)
onUnload(hide)
onShow(async () => {
  if (!suspended) return
  suspended = false
  try {
    await favorites.load(getRuntimeServices().favorites, true)
    if (suspended) return
    const review = favorites.tabState[bank.value].review
    await load({ ...lastQuery, index: String(review?.index || 0) })
  } catch {
    item.value = undefined
    error.value = '复习状态校验失败，请重试'
  }
})
</script>
<template>
  <PersonalPage
    :active="ProfileTabKey.FAVORITES"
    title="翻卡复习"
    :subtitle="`第 ${index + 1} 张 / ${cardIds.length} · ${face === ReviewCardFace.FRONT ? '正面' : '答案面'}`"
  >
    <ReviewCard v-if="item" :item="item" :face="face" @flip="flip" />
    <AppState
      v-else
      icon-label="状态"
      title="暂无复习卡片"
      :description="error || '请从收藏银行开始复习'"
    />
    <text v-if="error && item" class="form-error">{{ error }}</text>
    <template #actions
      ><AppButton
        v-if="item"
        label="再看一次"
        :variant="ButtonVariant.SECONDARY"
        @press="again" /><AppButton v-if="item" :label="nextLabel" :loading="busy" @press="next"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../profile/personal';
</style>
