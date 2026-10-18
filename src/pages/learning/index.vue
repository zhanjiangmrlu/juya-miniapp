<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import LearningStatistics from '@/features/learning/components/learning-statistics.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'
import { session } from '@/services/api'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { CardBrief } from '@/shared/types/learning'
const account = useAccountStore(),
  cards = ref<CardBrief[]>([]),
  total = ref<number | null>(null),
  busy = ref(false),
  error = ref(''),
  statsError = ref('')
let pages = 1,
  generation = 0
/** 刷新已加载范围，保留现有列表高度和来源滚动位置 */
const refresh = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const run = ++generation
  try {
    if (!(await account.ensure(Routes.LEARNING))) return
    const results = await Promise.all(
      Array.from({ length: pages }, (_, index) =>
        session.request<components['schemas']['Page_CardBrief_']>(
          `/api/mini/v1/cards?page=${index + 1}&limit=20`
        )
      )
    )
    if (run === generation) {
      cards.value = results.flatMap((result) => result.items)
      total.value = results[0]?.total || 0
    }
  } catch (reason) {
    if (run === generation)
      error.value = reason instanceof Error ? reason.message : '学习列表暂未获取'
  } finally {
    if (run === generation) busy.value = false
  }
}
/** 统计单独失败时仍允许查看场景卡片 */
const refreshStats = async () => {
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
/** 接续加载下一页，不重复重排已有卡片 */
const loadMore = async () => {
  if (busy.value || total.value === null || cards.value.length >= total.value) return
  pages++
  await refresh()
}
/** 打开账号只读资料页 */
const profile = () => uni.navigateTo({ url: Routes.PROFILE })
/** 从显式记录入口打开最近使用的标签 */
const records = () => uni.navigateTo({ url: Routes.RECORDS })
onShow(() => {
  // H5 直接刷新路由时可能尚未建立原生底栏，使用回调处理该状态
  uni.hideTabBar({ animation: false, fail: () => undefined })
  void refresh()
  void refreshStats()
})
onPullDownRefresh(async () => {
  await Promise.allSettled([refresh(), refreshStats()])
  uni.stopPullDownRefresh()
})
onReachBottom(() => {
  void loadMore()
})
onUnload(() => {
  generation++
})
</script>
<template>
  <AppPage title="句芽英语" footer>
    <view class="welcome between">
      <text class="greeting">{{ account.profile?.nickname || '学习者' }}，今天也学一点</text>
      <button class="account-link" aria-label="账号资料" @click="profile">
        <text>账号</text>
      </button>
    </view>
    <text class="home-title">English, every day.</text>
    <LearningStatistics v-if="account.statistics" :statistics="account.statistics" />
    <AppState v-else :busy="!statsError" :error="statsError" @retry="refreshStats" />
    <view v-if="statsError && account.statistics" class="notice error">
      统计暂未更新 <button class="text-button" @click="refreshStats">重试</button>
    </view>
    <view class="today-line between">
      <view class="today-label"
        ><image src="/static/design/calendar.svg" mode="aspectFit" aria-hidden="true" /><text
          class="today-status"
          >{{
            account.statistics
              ? account.statistics.checked_in_today
                ? '今日已打卡'
                : '今日还未打卡'
              : '今日状态暂未获取'
          }}</text
        ></view
      >
      <button class="text-button" @click="records">
        学习记录<image src="/static/design/record-arrow.svg" mode="aspectFit" aria-hidden="true" />
      </button>
    </view>
    <text class="today-help">{{
      account.statistics?.checked_in_today
        ? '继续学习或复习，积累更多表达。'
        : '完成任意一张场景卡，即可完成今日打卡。'
    }}</text>
    <view class="catalog-heading between">
      <text class="section-title">场景卡片</text>
      <text v-if="total !== null" class="catalog-count">{{ total }} 张</text>
    </view>
    <AppState
      :busy="busy && total === null"
      :error="error"
      :empty="total === 0"
      title="场景卡正在准备中"
      description="发布后会在这里展示。"
      @retry="refresh"
      ><button v-if="total === 0" class="text-button" @click="refresh">刷新看看</button></AppState
    >
    <SceneCard v-for="(card, index) in cards" :key="card.id" :card="card" :featured="index === 0" />
    <button
      v-if="total !== null && cards.length < total"
      class="text-button more"
      :disabled="busy"
      @click="loadMore"
    >
      {{ busy ? '加载中…' : '加载更多' }}
    </button>
    <AppBottomTabs active="learning"
  /></AppPage>
</template>
<style scoped lang="scss">
.welcome {
  min-height: 53.846rpx;
  margin-bottom: 15.385rpx;

  .greeting {
    font-size: 25rpx;
    line-height: 42.5rpx;
    color: #586c5b;
  }

  .account-link {
    min-height: 53.846rpx;
    padding: 7.692rpx 0 7.692rpx 28.846rpx;
    border: 0;
    border-radius: 0;
    background: none;
    font-size: 23.077rpx;
    font-weight: 500;
    line-height: 38.462rpx;
    white-space: nowrap;
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

.today-line {
  min-height: 76.923rpx;
  font-size: 25rpx;
  line-height: 42.5rpx;

  .today-label {
    display: flex;
    align-items: center;
    gap: 15.385rpx;
    color: #ad4f32;
  }

  image {
    flex-shrink: 0;
    width: 34.615rpx;
    height: 34.615rpx;
  }

  button {
    gap: 15.385rpx;
    padding: 19.231rpx 0;
    font-size: 23.077rpx;
    line-height: 38.462rpx;
    white-space: nowrap;
  }
}

.today-help {
  display: block;
  margin-top: 3.846rpx;
  font-size: 21.154rpx;
  line-height: 38.077rpx;
  color: #586c5b;
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
