<script setup lang="ts">
import {
  onHide,
  onPageScroll,
  onPullDownRefresh,
  onReachBottom,
  onShow,
  onUnload
} from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useListPosition } from '@/composables/use-list-position'
import { useSceneList } from '@/composables/use-scene-list'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ListeningCollection from '@/features/listening/components/listening-collection.vue'
import { onSessionExpired, session } from '@/services/api'
import { Routes } from '@/shared/constants/navigation'
import { ContentType } from '@/shared/enums/listening'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
const kind = ref<ContentType>(ContentType.SCENE)
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
  refresh: refreshList,
  restart: restartList,
  more,
  dispose,
  reset: resetList
} = useSceneList<components['schemas']['PersonalSummary']>({
  path: '/api/mini/v1/favorites',
  request: session.request,
  userId: session.userId,
  ensure: () => account.ensure(Routes.FAVORITES)
})
const position = useListPosition(session.userId)
/** 保留详情返回前的滚动位置和已读页 */
const refresh = () => position.preserve(refreshList)
/** 主动下拉成功后清除旧阅读位置，新轮次失败仍保留可信内容 */
const restart = async () => {
  const owner = session.userId()
  await restartList()
  if (owner === session.userId() && !error.value) position.reset()
}
/** 账号切换同时清除上一账号的列表和位置 */
const reset = () => {
  resetList()
  position.reset()
}
onPageScroll((event) => position.scroll(event.scrollTop))
const unsubscribe = onSessionExpired(reset)
/** 空收藏可以直接回到学习入口 */
const learn = () => uni.navigateTo({ url: Routes.LEARNING })
onShow(() => {
  // H5 直接刷新路由时可能尚未建立原生底栏，使用回调处理该状态
  uni.hideTabBar({ animation: false, fail: () => undefined })
  void refresh()
})
onPullDownRefresh(async () => {
  try {
    await restart()
  } finally {
    uni.stopPullDownRefresh()
  }
})
onHide(position.dispose)
onReachBottom(() => {
  void more()
})
onUnload(() => {
  dispose()
  position.dispose()
  unsubscribe()
})
</script>
<template>
  <AppPage title="我的收藏" class="favorites-page" back>
    <view class="tabs"
      ><button
        class="tab-button"
        :class="{ active: kind === ContentType.SCENE }"
        @click="kind = ContentType.SCENE"
      >
        场景</button
      ><button
        class="tab-button"
        :class="{ active: kind === ContentType.LISTENING }"
        @click="kind = ContentType.LISTENING"
      >
        听读
      </button></view
    ><ListeningCollection v-if="kind === ContentType.LISTENING" mode="favorites" /><view
      v-show="kind === ContentType.SCENE"
    >
      <AppState
        :busy="busy && total === null"
        :error="total === null ? error : ''"
        :empty="total === 0"
        title="还没有收藏的卡片"
        description="在详情点击“收藏整卡”，以后就能在这里找到。"
        @retry="refresh"
        ><button class="primary" @click="learn">去学习</button></AppState
      >
      <SceneCard v-for="card in cards" :key="card.id" :card="card" history source="favorites" />
      <SceneListFooter
        :busy="moreBusy"
        :refreshing="busy && total !== null"
        :refresh-error="total !== null ? error : ''"
        :error="moreError"
        :has-more="hasMore"
        :done="done"
        @refresh="refresh"
        @more="more"
      /> </view
  ></AppPage>
</template>
<style scoped lang="scss">
.tabs {
  display: flex;
  border-bottom: 1px solid #dfe5d8;
  margin: 28rpx 0 0;

  .tab-button {
    flex: 1;
    min-height: 48px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    font-size: 25rpx;

    &.active {
      border-bottom-color: #2b4438;
      font-weight: 700;
    }
  }
}
</style>
