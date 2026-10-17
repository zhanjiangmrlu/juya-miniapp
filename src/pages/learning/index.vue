<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppAvatar from '@/components/app-avatar/app-avatar.vue'
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
  <AppPage title="句芽英语"
    ><template #action
      ><button class="text-button account-link" @click="profile">账号资料</button></template
    ><view class="welcome between"
      ><view
        ><text class="greeting">{{ account.profile?.nickname || '学习者' }}，你好</text
        ><text class="welcome-text">从一个真实场景，开始今天的学习</text></view
      ><AppAvatar :src="account.avatarURL" :size="84" /></view
    ><LearningStatistics v-if="account.statistics" :statistics="account.statistics" /><AppState
      v-else
      :busy="!statsError"
      :error="statsError"
      @retry="refreshStats"
    /><view v-if="statsError && account.statistics" class="notice error"
      >统计暂未更新 <button class="text-button" @click="refreshStats">重试</button></view
    ><view class="today-line between"
      ><text>{{
        account.statistics
          ? account.statistics.checked_in_today
            ? '✓ 今日已打卡'
            : '今日待打卡 · 完成一张卡片即可记录'
          : '今日状态暂未获取'
      }}</text
      ><button class="text-button" @click="records">查看学习记录 ›</button></view
    ><view class="catalog-heading between"
      ><text class="section-title">场景学习</text
      ><text v-if="total !== null" class="muted small">{{ total }} 张场景卡</text></view
    ><AppState
      :busy="busy && total === null"
      :error="error"
      :empty="total === 0"
      title="场景卡正在准备中"
      description="稍后再来看看，已有学习记录会保留"
      @retry="refresh"
    /><SceneCard v-for="card in cards" :key="card.id" :card="card" /><button
      v-if="total !== null && cards.length < total"
      class="text-button more"
      :disabled="busy"
      @click="loadMore"
    >
      {{ busy ? '加载中…' : '加载更多' }}</button
    ><text v-else-if="cards.length" class="list-end">已显示全部场景卡</text></AppPage
  >
</template>
<style scoped lang="scss">
.welcome {
  padding: 12rpx 0 8rpx;

  .greeting {
    font-size: 40rpx;
    font-weight: 650;
    display: block;
  }

  .welcome-text {
    font-size: 24rpx;
    color: #637268;
    margin-top: 10rpx;
    display: block;
  }
}

.today-line {
  font-size: 22rpx;
  color: #637268;
  padding: 20rpx 0;

  button {
    font-size: 22rpx;
    white-space: nowrap;
  }
}

.catalog-heading {
  margin-top: 26rpx;

  .section-title {
    margin-bottom: 0;
  }
}

.account-link {
  font-size: 22rpx;
}

.list-end {
  display: block;
  font-size: 22rpx;
  color: #91a08d;
  text-align: center;
  padding: 32rpx 0;
}

.more {
  width: 100%;
  margin-top: 24rpx;
}
</style>
