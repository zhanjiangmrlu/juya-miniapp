<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
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
  // H5 直接刷新路由时可能尚未建立原生底栏，使用回调处理该状态
  uni.hideTabBar({ animation: false, fail: () => undefined })
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
  <AppPage title="我的收藏" class="favorites-page" footer>
    <view class="favorites-heading between"
      ><text class="section-title">整卡收藏</text
      ><text v-if="total !== null" class="count">{{ total }} 张</text></view
    >
    <text class="favorites-help">按收藏时间由近到远，点击场景卡开始复习。</text>
    <AppState
      :busy="busy && total === null"
      :error="error"
      :empty="total === 0"
      title="还没有收藏场景卡"
      description="在详情点击“收藏整卡”，以后就能在这里找到。"
      @retry="refresh"
      ><button class="primary" @click="learn">去学习</button></AppState
    >
    <SceneCard v-for="card in cards" :key="card.id" :card="card" history />
    <button
      v-if="total !== null && cards.length < total"
      class="text-button more"
      :disabled="busy"
      @click="more"
    >
      {{ busy ? '加载中…' : '加载更多' }}
    </button>
    <AppBottomTabs active="favorites"
  /></AppPage>
</template>
<style scoped lang="scss">
.favorites-page {
  :deep(.nav-title) {
    margin-left: 80.769rpx;
  }
}

.favorites-heading {
  margin: 53.846rpx 0 25rpx;
  align-items: baseline;

  .section-title {
    margin: 0;
    font-size: 38.462rpx;
    line-height: 1.5;
    font-weight: 600;
  }

  .count {
    font-size: 23.077rpx;
    color: #586c5b;
  }
}

.favorites-help {
  display: block;
  font-size: 23.077rpx;
  line-height: 1.8;
  color: #586c5b;
  margin: 13.462rpx 0;
}

.more {
  width: 100%;
  margin-top: 23.077rpx;
}
</style>
