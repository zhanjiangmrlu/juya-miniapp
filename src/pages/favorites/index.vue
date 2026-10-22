<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppLoading from '@/components/app-loading/app-loading.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import { onSessionExpired, session } from '@/services/api'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
const account = useAccountStore()
const {
  items: cards,
  total,
  busy,
  moreBusy,
  error,
  moreError,
  hasMore,
  done,
  refresh,
  more,
  dispose,
  reset
} = useSceneList<components['schemas']['PersonalSummary']>({
  path: '/api/mini/v1/favorites',
  request: session.request,
  userId: session.userId,
  ensure: () => account.ensure(Routes.FAVORITES)
})
const unsubscribe = onSessionExpired(reset)
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
  dispose()
  unsubscribe()
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
      :error="error && (total === null ? error : `列表暂未更新：${error}`)"
      :empty="total === 0"
      title="还没有收藏的卡片"
      description="在详情点击“收藏整卡”，以后就能在这里找到。"
      @retry="refresh"
      ><button class="primary" @click="learn">去学习</button></AppState
    >
    <view v-if="busy && total !== null" class="refreshing"><AppLoading label="正在刷新" /></view>
    <SceneCard v-for="card in cards" :key="card.id" :card="card" history source="favorites" />
    <SceneListFooter
      :busy="moreBusy"
      :error="moreError"
      :has-more="hasMore"
      :done="done"
      @more="more" />
    <AppBottomTabs active="favorites"
  /></AppPage>
</template>
<style scoped lang="scss">
.refreshing {
  padding: 19.231rpx 0;
  color: #586c5b;
  font-size: 23.077rpx;
  text-align: center;
}

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
