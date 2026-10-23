<script setup lang="ts">
import {
  onHide,
  onLoad,
  onPageScroll,
  onPullDownRefresh,
  onReachBottom,
  onShow,
  onUnload
} from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useListPosition } from '@/composables/use-list-position'
import { useNativeShare } from '@/composables/use-native-share'
import { useSceneList } from '@/composables/use-scene-list'
import LearningStatistics from '@/features/learning/components/learning-statistics.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ShareSummary from '@/features/share/components/share-summary.vue'
import { onSessionExpired, session } from '@/services/api'
import { feedbackInbox } from '@/services/feedback-service'
import { listPageSize } from '@/services/list-page-size'
import { runtimeMode } from '@/services/runtime-mode'
import { homeShare } from '@/services/share-service'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { CardBrief } from '@/shared/types/learning'
const account = useAccountStore(),
  statsError = ref('')
const browseOnly = runtimeMode.browseOnly,
  accessReady = ref(!browseOnly.value),
  share = useNativeShare(
    () => homeShare.friends,
    () => homeShare.timeline
  )
let sharedEntry = false,
  requiresIdentityCheck = browseOnly.value
const {
  items: cards,
  total,
  publishedTotal,
  busy,
  moreBusy,
  error,
  moreError,
  hasMore,
  done,
  refresh: refreshList,
  restart: restartList,
  more: loadMore,
  dispose,
  reset: resetList
} = useSceneList<CardBrief>({
  path: '/api/mini/v1/cards',
  pageSize: () => listPageSize(268.577, 1050),
  request: session.request,
  userId: session.userId,
  ensure: () => account.ensure(Routes.LEARNING)
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
/** 统计单独失败时仍允许查看场景卡片 */
const refreshStats = async () => {
  if (runtimeMode.update()) return
  statsError.value = ''
  try {
    if (await account.ensure(Routes.LEARNING)) {
      await account.refreshStatistics()
      await account.refreshAvatar()
    }
  } catch (reason) {
    statsError.value = reason instanceof Error ? reason.message : '学习统计暂未获取'
  }
}
/** 打开账号只读资料页 */
const profile = () => uni.navigateTo({ url: Routes.PROFILE })
/** 从显式记录入口打开最近使用的标签 */
const records = () => uni.navigateTo({ url: Routes.RECORDS })
/** 当前场景全部学完后仍可从收藏选择复习 */
const favorites = () => uni.switchTab({ url: Routes.FAVORITES })
/** 分享进入时先重验本人会话，再读取私人列表和统计 */
const showPage = async () => {
  if (runtimeMode.update()) return
  // H5 直接刷新路由时可能尚未建立原生底栏，使用回调处理该状态
  uni.hideTabBar({ animation: false, fail: () => undefined })
  if (sharedEntry || requiresIdentityCheck) {
    try {
      if (
        !(await account.ensure(`${Routes.LEARNING}?target=learning`)) ||
        !(await account.restore())
      )
        return
    } catch (reason) {
      statsError.value = reason instanceof Error ? reason.message : '会话暂未确认，请重试'
      return
    }
  }
  if (runtimeMode.update()) return
  requiresIdentityCheck = false
  await Promise.allSettled([refresh(), refreshStats(), feedbackInbox.refresh()])
  if (!runtimeMode.update()) accessReady.value = true
}
onShow(showPage)
onLoad((query) => {
  sharedEntry = query?.target === 'learning'
  if (sharedEntry) accessReady.value = false
})
watch(
  browseOnly,
  (restricted) => {
    share.hide()
    if (restricted) {
      accessReady.value = false
      requiresIdentityCheck = true
      reset()
    }
    if (!restricted) void showPage()
  },
  { flush: 'sync' }
)
onHide(() => {
  share.hide()
  position.dispose()
})
onPullDownRefresh(async () => {
  if (runtimeMode.update()) {
    uni.stopPullDownRefresh()
    return
  }
  await Promise.allSettled([restart(), refreshStats()])
  uni.stopPullDownRefresh()
})
onReachBottom(() => {
  if (runtimeMode.update()) return
  void loadMore()
})
onUnload(() => {
  dispose()
  position.dispose()
  unsubscribe()
})
</script>
<template>
  <AppPage
    title="句芽英语"
    :footer="!browseOnly"
    public-summary
    :shareable="!browseOnly && Boolean(account.profile)"
  >
    <ShareSummary v-if="browseOnly" />
    <AppState v-else-if="!accessReady" :busy="!statsError" :error="statsError" @retry="showPage" />
    <template v-else>
      <view class="welcome between">
        <text class="greeting">{{ account.profile?.nickname || '学习者' }}，今天也学一点</text>
        <button class="account-link" aria-label="账号资料" @click="profile">
          <text>账号</text
          ><text
            v-if="feedbackInbox.value.value.unread"
            class="feedback-dot"
            aria-label="有未读反馈回复"
          />
        </button>
      </view>
      <text class="home-title">English, every day.</text>
      <LearningStatistics v-if="account.statistics" :statistics="account.statistics" />
      <AppState
        v-else
        :busy="!statsError"
        :error="statsError && '统计暂未获取'"
        @retry="refreshStats" />
      <view v-if="statsError && account.statistics" class="notice error">
        统计暂未更新 <button class="text-button" @click="refreshStats">重试</button>
      </view>
      <button class="records-entry between" @click="records">
        <view
          ><image src="/static/design/calendar.svg" mode="aspectFit" aria-hidden="true" /><text
            >学习记录</text
          ></view
        ><image src="/static/design/chevron.svg" mode="aspectFit" aria-hidden="true" />
      </button>
      <view class="today-line between"
        ><image src="/static/design/calendar.svg" mode="aspectFit" aria-hidden="true" /><text>{{
          account.statistics
            ? account.statistics.checked_in_today
              ? '今日已打卡'
              : '今日还未打卡'
            : '今日状态暂未获取'
        }}</text></view
      >
      <view class="catalog-heading between">
        <text class="section-title">待学场景</text>
        <text v-if="total !== null" class="catalog-count">{{ total }} 张</text>
      </view>
      <AppState
        :busy="busy && total === null"
        :error="total === null ? error : ''"
        :empty="total === 0"
        :title="publishedTotal > 0 ? '当前场景卡已全部学完' : '暂无可学习的场景卡'"
        :description="
          publishedTotal > 0
            ? '可以到学习记录复习已学场景。'
            : '场景卡发布后会在这里展示，历史学习记录会保留。'
        "
        @retry="refresh"
        ><view v-if="total === 0 && publishedTotal > 0" class="empty-actions"
          ><button class="primary" @click="records">查看学习记录</button
          ><button @click="favorites">查看收藏</button></view
        ></AppState
      >
      <SceneCard
        v-for="(card, index) in cards"
        :key="card.id"
        :card="card"
        :featured="index === 0"
        source="learning" />
      <SceneListFooter
        :busy="moreBusy"
        :refreshing="busy && total !== null"
        :refresh-error="total !== null ? error : ''"
        :error="moreError"
        :has-more="hasMore"
        :done="done"
        @refresh="refresh"
        @more="loadMore" />
      <AppBottomTabs active="learning"
    /></template>
  </AppPage>
</template>
<style scoped lang="scss">
.empty-actions {
  display: flex;
  justify-content: center;
  gap: 19.231rpx;
}

.welcome {
  min-height: 53.846rpx;
  margin-bottom: 15.385rpx;

  .greeting {
    font-size: 25rpx;
    line-height: 42.5rpx;
    color: #586c5b;
  }

  .account-link {
    display: flex;
    align-items: center;
    gap: 11.538rpx;
    min-height: 53.846rpx;
    padding: 7.692rpx 0 7.692rpx 28.846rpx;
    border: 0;
    border-radius: 0;
    background: none;
    font-size: 23.077rpx;
    font-weight: 500;
    line-height: 38.462rpx;
    white-space: nowrap;

    .feedback-dot {
      width: 15.385rpx;
      height: 15.385rpx;
      border-radius: 50%;
      background: #ad4f32;
    }
  }
}

.home-title {
  display: block;
  margin-bottom: 38.462rpx;
  font-family: Fraunces, Georgia, serif;
  font-size: 51.923rpx;
  font-weight: 400;
  line-height: 72.692rpx;
  letter-spacing: -0.025em;
}

.records-entry {
  width: 100%;
  min-height: 103.846rpx;
  padding: 26.923rpx 32.692rpx;
  border: 1px solid #dfe5d8;
  border-radius: 19.231rpx;
  background: #fff;
  font-size: 30.769rpx;
  line-height: 46.154rpx;

  view {
    display: flex;
    align-items: center;
    gap: 19.231rpx;
  }

  image {
    width: 38.462rpx;
    height: 38.462rpx;
    flex-shrink: 0;
  }
}

.today-line {
  margin-top: 30.769rpx;
  min-height: 42.5rpx;
  font-size: 25rpx;
  line-height: 42.5rpx;

  image {
    width: 34.615rpx;
    height: 34.615rpx;
  }
}

.catalog-heading {
  margin: 53.846rpx 0 25rpx;
  align-items: baseline;

  .section-title {
    margin: 0;
    font-size: 38.462rpx;
    font-weight: 500;
    line-height: 57.692rpx;
  }

  .catalog-count {
    font-size: 23.077rpx;
    color: #586c5b;
  }
}

.more {
  width: 100%;
  margin-top: 23.077rpx;
}
</style>
