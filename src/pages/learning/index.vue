<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppAvatar from '@/components/app-avatar/app-avatar.vue'
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
        <AppAvatar v-if="account.avatarURL" :src="account.avatarURL" :size="44" />
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
      <text class="today-status">{{
        account.statistics
          ? account.statistics.checked_in_today
            ? '✓ 今日已打卡'
            : '▣ 今日还未打卡'
          : '今日状态暂未获取'
      }}</text>
      <button class="text-button" @click="records">学习记录 ›</button>
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
      @retry="refresh" />
    <SceneCard v-for="(card, index) in cards" :key="card.id" :card="card" :featured="index === 0" />
    <button
      v-if="total !== null && cards.length < total"
      class="text-button more"
      :disabled="busy"
      @click="loadMore"
    >
      {{ busy ? '加载中…' : '加载更多' }}
    </button>
    <text v-else-if="cards.length" class="list-end">已显示全部场景卡</text>
    <AppBottomTabs active="learning"
  /></AppPage>
</template>
<style scoped lang="scss">
.welcome {
  min-height: 46.154rpx;
  margin-bottom: 15.385rpx;

  .greeting {
    font-size: 25rpx;
    line-height: 1.7;
    color: #586c5b;
  }

  .account-link {
    display: flex;
    gap: 9.615rpx;
    padding: 3.846rpx 0 3.846rpx 15.385rpx;
    border: 0;
    border-radius: 0;
    background: none;
    font-size: 23.077rpx;
    font-weight: 500;
    white-space: nowrap;
  }
}

.home-title {
  display: block;
  font-family: Fraunces, Georgia, serif;
  font-size: 51.923rpx;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: -0.025em;
  margin-bottom: 38.462rpx;
}

.today-line {
  font-size: 25rpx;
  line-height: 1.7;
  margin-bottom: 3.846rpx;

  .today-status {
    color: #ad4f32;
  }

  button {
    font-size: 23.077rpx;
    padding: 7.692rpx 0;
    white-space: nowrap;
  }
}

.today-help {
  display: block;
  color: #586c5b;
  font-size: 21.154rpx;
  line-height: 1.8;
  margin-top: 3.846rpx;
}

.catalog-heading {
  margin: 53.846rpx 0 25rpx;
  align-items: baseline;

  .section-title {
    font-size: 38.462rpx;
    line-height: 1.5;
    font-weight: 600;
    margin: 0;
  }

  .catalog-count {
    font-size: 23.077rpx;
    color: #586c5b;
  }
}

.list-end {
  display: block;
  font-size: 21.154rpx;
  color: #586c5b;
  text-align: center;
  padding: 30.769rpx 0;
}

.more {
  width: 100%;
  margin-top: 23.077rpx;
}
</style>
