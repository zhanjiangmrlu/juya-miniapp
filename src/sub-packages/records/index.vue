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
import { computed, nextTick, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import LearningStatistics from '@/features/learning/components/learning-statistics.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import { onSessionExpired, session } from '@/services/api'
import { dateText } from '@/services/display'
import { listPageSize } from '@/services/list-page-size'
import { storage } from '@/services/platform'
import { RECORDS_TAB_STORAGE_KEY } from '@/shared/constants/learning'
import { Routes } from '@/shared/constants/navigation'
import { RecordsTab } from '@/shared/enums/learning'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
const account = useAccountStore(),
  tab = ref<RecordsTab>(RecordsTab.LEARNED),
  statsError = ref(''),
  expanded = ref(''),
  day = ref<components['schemas']['DailyRecords'] | null>(null),
  dayBusy = ref(false),
  dayError = ref('')
const learnedList = useSceneList<components['schemas']['LearningRecord']>({
    path: '/api/mini/v1/me/learning-records',
    request: session.request,
    ensure: () => account.ensure(Routes.RECORDS),
    userId: session.userId,
    pageSize: () => listPageSize(268.577, 650)
  }),
  checkinList = useSceneList<components['schemas']['CheckinRecord']>({
    path: '/api/mini/v1/me/checkins',
    request: session.request,
    ensure: () => account.ensure(Routes.RECORDS),
    userId: session.userId,
    pageSize: () => listPageSize(190, 650),
    key: (item) => item.date
  })
const { items: learned, total: learnedTotal } = learnedList,
  { items: checkins, total: checkinTotal } = checkinList,
  activeList = computed(() => (tab.value === RecordsTab.LEARNED ? learnedList : checkinList)),
  busy = computed(() => activeList.value.busy.value),
  moreBusy = computed(() => activeList.value.moreBusy.value),
  moreError = computed(() => activeList.value.moreError.value),
  error = computed(() => activeList.value.error.value)
let dayGeneration = 0,
  viewGeneration = 0,
  owner = session.userId(),
  alive = true,
  currentScroll = 0,
  restoringScroll = false
const positions = { learned: 0, checkins: 0 }
/** 会话变化时清除私人记录、展开项和旧位置，保留服务器历史成绩 */
const reset = () => {
  learnedList.reset()
  checkinList.reset()
  dayGeneration++
  viewGeneration++
  expanded.value = ''
  day.value = null
  dayBusy.value = false
  dayError.value = ''
  positions.learned = 0
  positions.checkins = 0
  currentScroll = 0
  owner = session.userId()
}
const unsubscribe = onSessionExpired(reset)
/** 刷新当前标签的已读页，并保持展开日期和页面高度 */
const load = async () => {
  if (owner !== session.userId()) reset()
  const run = ++viewGeneration,
    view = tab.value,
    accountId = owner,
    target = positions[view]
  await Promise.all([
    activeList.value.refresh(),
    expanded.value ? loadDay(expanded.value) : Promise.resolve()
  ])
  await nextTick()
  if (!alive || run !== viewGeneration || view !== tab.value || accountId !== session.userId())
    return
  if (target === 0 && currentScroll === 0) return
  // 原生滚动事件在恢复期间会被忽略，先同步本页位置避免写入另一个标签
  currentScroll = target
  restoringScroll = true
  uni.pageScrollTo?.({
    scrollTop: target,
    duration: 0,
    complete: () => {
      if (run === viewGeneration) restoringScroll = false
    }
  })
}
/** 统计日期由服务器给出，保留已删除卡片对应的历史成绩和打卡天数 */
const loadStats = async () => {
  statsError.value = ''
  try {
    if (await account.ensure(Routes.RECORDS)) await account.refreshStatistics()
  } catch (reason) {
    statsError.value = reason instanceof Error ? reason.message : '统计暂未获取'
  }
}
/** 同页切换标签并恢复各自阅读位置
 * @param value 目标记录标签
 */
const switchTab = async (value: RecordsTab) => {
  if (tab.value === value) return
  positions[tab.value] = currentScroll
  tab.value = value
  storage.set(RECORDS_TAB_STORAGE_KEY, value)
  await load()
}
/** 读取该北京时间日期的可展示卡片，迟到结果不覆盖其他日期
 * @param date 当前展开的打卡日期
 */
const loadDay = async (date: string) => {
  const run = ++dayGeneration,
    accountId = session.userId()
  dayBusy.value = true
  dayError.value = ''
  try {
    const value = await session.request<components['schemas']['DailyRecords']>(
      `/api/mini/v1/me/checkins/${date}`
    )
    if (alive && run === dayGeneration && accountId === session.userId() && expanded.value === date)
      day.value = value
  } catch (reason) {
    if (alive && run === dayGeneration && accountId === session.userId() && expanded.value === date)
      dayError.value = reason instanceof Error ? reason.message : '当日记录暂未获取'
  } finally {
    if (alive && run === dayGeneration && accountId === session.userId()) dayBusy.value = false
  }
}
/** 展开或收起日期，刷新失败保留已展示的日期卡片
 * @param date 用户选择的打卡日期
 */
const expand = async (date: string) => {
  if (expanded.value === date && !dayError.value) {
    expanded.value = ''
    dayGeneration++
    dayBusy.value = false
    return
  }
  if (expanded.value !== date) day.value = null
  expanded.value = date
  await loadDay(date)
}
/** 仅追加当前标签下一屏，错误提示留在底部 */
const more = async () => {
  if (owner !== session.userId()) {
    reset()
    return
  }
  await activeList.value.more()
}
/** 新用户可返回学习入口 */
const learn = () => uni.switchTab({ url: Routes.LEARNING })
onLoad((query) => {
  tab.value =
    query?.tab === RecordsTab.CHECKINS ||
    (!query?.tab && storage.get(RECORDS_TAB_STORAGE_KEY) === RecordsTab.CHECKINS)
      ? RecordsTab.CHECKINS
      : RecordsTab.LEARNED
})
onShow(() => {
  void load()
  void loadStats()
})
onHide(() => {
  viewGeneration++
})
onPullDownRefresh(async () => {
  if (owner !== session.userId()) reset()
  const run = ++viewGeneration,
    view = tab.value,
    accountId = owner,
    list = activeList.value
  try {
    await Promise.allSettled([list.restart(), loadStats()])
    if (
      alive &&
      run === viewGeneration &&
      view === tab.value &&
      accountId === session.userId() &&
      !list.error.value
    ) {
      positions[view] = 0
      currentScroll = 0
      restoringScroll = false
      dayGeneration++
      expanded.value = ''
      day.value = null
      dayBusy.value = false
      dayError.value = ''
    }
  } finally {
    uni.stopPullDownRefresh()
  }
})
onReachBottom(() => {
  void more()
})
onPageScroll((event) => {
  if (!restoringScroll) {
    currentScroll = event.scrollTop
    positions[tab.value] = currentScroll
  }
})
onUnload(() => {
  alive = false
  viewGeneration++
  dayGeneration++
  learnedList.dispose()
  checkinList.dispose()
  unsubscribe()
})
</script>
<template>
  <AppPage title="学习记录" back>
    <LearningStatistics
      v-if="account.statistics"
      :statistics="account.statistics"
      :show-units="false"
      :on-select="switchTab"
    />
    <AppState v-else :busy="!statsError" :error="statsError && '统计暂未获取'" @retry="loadStats" />
    <view v-if="statsError && account.statistics" class="notice error"
      >统计暂未更新 <button class="text-button" @click="loadStats">重试</button></view
    >
    <view class="tabs">
      <button
        :class="{ active: tab === RecordsTab.LEARNED }"
        @click="switchTab(RecordsTab.LEARNED)"
      >
        已学卡片 {{ learnedTotal ?? '' }}
      </button>
      <button
        :class="{ active: tab === RecordsTab.CHECKINS }"
        @click="switchTab(RecordsTab.CHECKINS)"
      >
        打卡记录 {{ checkinTotal ?? account.statistics?.total_checkin_days ?? '' }}
      </button>
    </view>
    <AppState
      :busy="busy && (tab === RecordsTab.LEARNED ? learnedTotal === null : checkinTotal === null)"
      :error="(tab === RecordsTab.LEARNED ? learnedTotal : checkinTotal) === null ? error : ''"
      :empty="tab === RecordsTab.LEARNED ? learnedTotal === 0 : checkinTotal === 0"
      :title="
        tab === RecordsTab.LEARNED && account.statistics && account.statistics.completed_cards > 0
          ? '暂无可展示的已学卡片'
          : '完成一张场景卡，开始记录学习'
      "
      :description="
        tab === RecordsTab.LEARNED
          ? account.statistics && account.statistics.completed_cards > 0
            ? '学习成绩和打卡记录会保留，可返回学习页查看其他场景。'
            : '学完场景卡后点击“已完成学习”。'
          : '完成任意场景卡，点亮今天。'
      "
      @retry="load"
      ><button class="primary" @click="learn">去学习</button></AppState
    >
    <view v-show="tab === RecordsTab.LEARNED">
      <SceneCard v-for="card in learned" :key="card.id" :card="card" history source="records"
        ><text class="record-hint">已学过 · 点击复习</text></SceneCard
      >
    </view>
    <view v-show="tab === RecordsTab.CHECKINS">
      <view v-for="record in checkins" :key="record.date" class="checkin">
        <button
          class="checkin-heading"
          :aria-expanded="expanded === record.date"
          @click="expand(record.date)"
        >
          <text class="checkin-date">{{ record.date }}</text
          ><text class="checkin-badge">{{
            record.date === account.statistics?.date ? '今日已打卡' : '已打卡'
          }}</text
          ><text class="arrow">{{ expanded === record.date ? '⌃' : '⌄' }}</text>
        </button>
        <text class="checkin-summary">当日完成 {{ record.card_count }} 张 · 每日只记一次打卡</text>
        <view v-if="expanded === record.date" class="day-cards">
          <AppState :busy="dayBusy" :error="dayError" @retry="expand(record.date)" />
          <SceneCard
            v-for="card in day?.items"
            :key="card.id"
            :card="card"
            history
            compact
            source="day"
            :day="record.date"
            ><text class="daily-time">{{ dateText(card.completed_at) }}</text></SceneCard
          >
        </view>
      </view>
    </view>
    <SceneListFooter
      :busy="moreBusy"
      :refreshing="
        busy && (tab === RecordsTab.LEARNED ? learnedTotal !== null : checkinTotal !== null)
      "
      :refresh-error="
        (tab === RecordsTab.LEARNED ? learnedTotal : checkinTotal) !== null ? error : ''
      "
      :error="moreError"
      :has-more="activeList.hasMore.value"
      :done="activeList.done.value"
      @refresh="load"
      @more="more"
    />
  </AppPage>
</template>
<style scoped lang="scss">
.tabs {
  display: flex;
  border-bottom: 1px solid #dfe5d8;
  margin: 50rpx 0 13.462rpx;

  button {
    flex: 1;
    border: 0;
    border-radius: 0;
    background: none;
    padding: 19.231rpx 11.538rpx;
    font-size: 25rpx;
    min-height: 88.462rpx;
    color: #586c5b;

    &.active {
      color: #2b4438;
      font-weight: 500;
    }
  }
}

.record-hint {
  display: block;
  margin-top: 11.538rpx;
  font-size: 21.154rpx;
  line-height: 35.962rpx;
  color: #586c5b;
}

.daily-time {
  font-size: 19.231rpx;
  color: #586c5b;
  display: block;
  margin-top: 7.692rpx;
}

.checkin {
  padding: 40.385rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .checkin-heading {
    display: flex;
    align-items: center;
    gap: 11.538rpx;
    width: 100%;
    border: 0;
    border-radius: 0;
    background: none;
    padding: 0;
    text-align: left;
  }

  .checkin-date {
    flex: 1;
    font-family: 'DM Sans', sans-serif;
    font-size: 28.846rpx;
    font-weight: 500;
  }

  .checkin-badge {
    background: #e4f0db;
    color: #47614b;
    font-size: 19.231rpx;
    border-radius: 7.692rpx;
    padding: 3.846rpx 11.538rpx;
  }

  .arrow {
    font-size: 23.077rpx;
    color: #586c5b;
  }

  .checkin-summary {
    display: block;
    font-size: 23.077rpx;
    line-height: 1.8;
    color: #586c5b;
    margin-top: 13.462rpx;
  }

  .day-cards {
    padding: 5.769rpx 23.077rpx;
    background: #f0f4e8;
    border-radius: 17.308rpx;
    margin-top: 25rpx;
  }
}

.more {
  width: 100%;
  margin-top: 19.231rpx;
}
</style>
