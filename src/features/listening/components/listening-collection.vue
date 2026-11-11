<script setup lang="ts">
import { onShow, onUnload } from '@dcloudio/uni-app'
import { onMounted, onUnmounted } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import { writeListening } from '@/features/listening/listening-service'
// #ifdef JUYA_ANALYTICS
import { businessAnalytics } from '@/services/analytics-business'
// #endif
import { session } from '@/services/api'
import { LISTENING_API } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
// #ifdef JUYA_ANALYTICS
import { AnalyticsAction } from '@/shared/enums/analytics'
// #endif
import { ListeningCollectionMode, ListeningTimestampKind } from '@/shared/enums/listening'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningSummary } from '@/shared/types/listening'
import type { ListeningCollectionProps } from '@/shared/types/listening-components'

import ListeningArticleCard from './listening-article-card.vue'
// #ifdef JUYA_ANALYTICS
let analyticsAlive = true
onUnmounted(() => {
  analyticsAlive = false
})
// #endif
const props = defineProps<ListeningCollectionProps>(),
  account = useAccountStore()
const list = useSceneList<ListeningSummary>({
  path: `${LISTENING_API}/${props.mode}`,
  request: session.request,
  userId: session.userId,
  ensure: () =>
    account.ensure(
      props.mode === ListeningCollectionMode.FAVORITES ? Routes.FAVORITES : Routes.RECORDS
    )
})
/** 空态返回主题听读选择真实内容 */
const explore = () => uni.navigateTo({ url: Routes.LISTENING })
/** 受限或删除文章的本人收藏仍允许取消
 * @param article 用户选择取消的安全摘要
 */
const remove = async (article: ListeningSummary) => {
  // #ifdef JUYA_ANALYTICS
  const owner = session.userId()
  // #endif

  try {
    await writeListening(`listening-unfavorite:${article.id}`, `/favorites/${article.id}`, 'DELETE')
    await list.refresh()
  } catch (reason) {
    // #ifdef JUYA_ANALYTICS
    if (analyticsAlive && owner === session.userId())
      businessAnalytics.error(AnalyticsAction.FAVORITE_CHANGE, reason, {
        content_type: 'listening',
        content_id: article.id
      })
    // #endif
    uni.showToast({
      title: reason instanceof Error ? reason.message : '取消失败，请重试',
      icon: 'none'
    })
  }
}
defineExpose({ more: list.more, refresh: list.refresh })
onMounted(() => void list.refresh())
onUnmounted(list.dispose)
onShow(() => void list.refresh())
onUnload(list.dispose)
</script>
<template>
  <view
    ><AppState
      :busy="list.busy.value && list.total.value === null"
      :error="list.error.value"
      :empty="list.total.value === 0"
      :title="mode === ListeningCollectionMode.FAVORITES ? '还没有收藏听读文章' : '还没有已学听读'"
      :description="
        mode === ListeningCollectionMode.FAVORITES
          ? '读到喜欢的一篇时，可以把整篇文章收藏在这里。'
          : '从首页主题听读开始，学习一篇喜欢的文章'
      "
      prominent
      centered-error
      :icon="
        mode === ListeningCollectionMode.FAVORITES
          ? '/static/listening/r17-favorite.svg'
          : '/static/listening/r17-empty-book.svg'
      "
      action-label="去主题听读"
      @action="explore"
      @retry="list.refresh" /><ListeningArticleCard
      v-for="article in list.items.value"
      :key="article.id"
      :article="article"
      :timestamp="
        mode === ListeningCollectionMode.FAVORITES
          ? ListeningTimestampKind.FAVORITE
          : ListeningTimestampKind.LEARNED
      "
      ><template #action
        ><button
          v-if="mode === ListeningCollectionMode.FAVORITES"
          class="text-button"
          @click="remove(article)"
        >
          取消收藏
        </button></template
      ></ListeningArticleCard
    ><SceneListFooter
      :busy="list.moreBusy.value"
      :error="list.moreError.value"
      :has-more="list.hasMore.value"
      :done="list.done.value"
      @more="list.more"
  /></view>
</template>
