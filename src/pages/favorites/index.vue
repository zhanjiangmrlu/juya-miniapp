<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'
import { session } from '@/services/api'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
const account = useAccountStore(),
  cards = ref<components['schemas']['PersonalSummary'][]>([]),
  total = ref<number | null>(null),
  busy = ref(false),
  error = ref('')
let pages = 1,
  generation = 0
/** 读取本人整卡收藏，停用卡仍显示安全摘要 */
const refresh = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const run = ++generation
  try {
    if (!(await account.ensure(Routes.FAVORITES))) return
    const results = await Promise.all(
      Array.from({ length: pages }, (_, index) =>
        session.request<components['schemas']['Page_PersonalSummary_']>(
          `/api/mini/v1/favorites?page=${index + 1}&limit=20`
        )
      )
    )
    if (run === generation) {
      cards.value = results.flatMap((result) => result.items)
      total.value = results[0]?.total || 0
    }
  } catch (reason) {
    if (run === generation) error.value = reason instanceof Error ? reason.message : '收藏暂未获取'
  } finally {
    if (run === generation) busy.value = false
  }
}
/** 继续读取本人收藏列表 */
const more = async () => {
  if (busy.value || total.value === null || cards.value.length >= total.value) return
  pages++
  await refresh()
}
/** 空收藏可以直接回到学习入口 */
const learn = () => uni.switchTab({ url: Routes.LEARNING })
onShow(() => {
  void refresh()
})
onPullDownRefresh(async () => {
  await refresh()
  uni.stopPullDownRefresh()
})
onReachBottom(() => {
  void more()
})
onUnload(() => {
  generation++
})
</script>
<template>
  <AppPage title="收藏"
    ><view class="favorites-heading"
      ><text class="title">我的收藏</text
      ><text class="muted small">收藏整张场景卡，随时回来复习</text></view
    ><AppState
      :busy="busy && total === null"
      :error="error"
      :empty="total === 0"
      title="还没有收藏场景卡"
      description="在场景详情中点“收藏”，把想复习的内容留在这里"
      @retry="refresh"
      ><button class="primary" @click="learn">去学习</button></AppState
    ><SceneCard v-for="card in cards" :key="card.id" :card="card" history /><button
      v-if="total !== null && cards.length < total"
      class="text-button more"
      :disabled="busy"
      @click="more"
    >
      {{ busy ? '加载中…' : '加载更多' }}
    </button></AppPage
  >
</template>
<style scoped lang="scss">
.favorites-heading {
  margin: 8rpx 0 28rpx;

  .title {
    margin-bottom: 12rpx;
  }
}

.more {
  width: 100%;
  margin-top: 24rpx;
}
</style>
