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
      ><button :class="{ active: kind === ContentType.SCENE }" @click="kind = ContentType.SCENE">
        场景收藏</button
      ><button
        :class="{ active: kind === ContentType.LISTENING }"
        @click="kind = ContentType.LISTENING"
      >
        听读收藏
      </button></view
    ><ListeningCollection v-if="kind === ContentType.LISTENING" mode="favorites" /><view
      v-show="kind === ContentType.SCENE"
      ><view class="favorites-heading between"
        ><text class="section-title">整卡收藏</text
        ><text v-if="total !== null" class="count">{{ total }} 张</text></view
      >
      <text class="favorites-help">按收藏时间由近到远，点击场景卡开始复习。</text>
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
  gap: 20rpx;

  button {
    flex: 1;
    font-size: 25rpx;
  }

  .active {
    background: #e4f0db;
  }
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
