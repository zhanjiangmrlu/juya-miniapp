<script setup lang="ts">
import { onLoad, onPageScroll, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { nextTick, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import LearningStatistics from '@/features/learning/components/learning-statistics.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'
import { session } from '@/services/api'
import { dateText } from '@/services/display'
import { storage } from '@/services/platform'
import { RECORDS_TAB_STORAGE_KEY } from '@/shared/constants/learning'
import { Routes } from '@/shared/constants/navigation'
import { RecordsTab } from '@/shared/enums/learning'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
const account = useAccountStore(),
  tab = ref<RecordsTab>(RecordsTab.LEARNED),
  learned = ref<components['schemas']['LearningRecord'][]>([]),
  checkins = ref<components['schemas']['CheckinRecord'][]>([]),
  learnedTotal = ref<number | null>(null),
  checkinTotal = ref<number | null>(null),
  busy = ref(false),
  error = ref(''),
  statsError = ref(''),
  expanded = ref(''),
  day = ref<components['schemas']['DailyRecords'] | null>(null),
  dayBusy = ref(false),
  dayError = ref('')
let learnedPages = 1,
  checkinPages = 1,
  generation = 0,
  alive = true,
  currentScroll = 0,
  restoringScroll = false
const positions = { learned: 0, checkins: 0 }
/** 分别刷新两个标签已加载的范围，不修改任何成绩 */
const load = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const run = ++generation,
    view = tab.value
  try {
    if (!(await account.ensure(Routes.RECORDS))) return
    if (view === RecordsTab.LEARNED) {
      const results = await Promise.all(
        Array.from({ length: learnedPages }, (_, index) =>
          session.request<components['schemas']['Page_LearningRecord_']>(
            `/api/mini/v1/me/learning-records?page=${index + 1}&limit=20`
          )
        )
      )
      if (alive && run === generation) {
        learned.value = results.flatMap((result) => result.items)
        learnedTotal.value = results[0]?.total || 0
      }
    } else {
      const results = await Promise.all(
        Array.from({ length: checkinPages }, (_, index) =>
          session.request<components['schemas']['Page_CheckinRecord_']>(
            `/api/mini/v1/me/checkins?page=${index + 1}&limit=20`
          )
        )
      )
      if (alive && run === generation) {
        checkins.value = results.flatMap((result) => result.items)
        checkinTotal.value = results[0]?.total || 0
      }
    }
  } catch (reason) {
    if (alive && run === generation)
      error.value = reason instanceof Error ? reason.message : '记录暂未获取'
  } finally {
    if (alive && run === generation) busy.value = false
  }
}
/** 统计日期由服务器给出，失败不填假零 */
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
  generation++
  busy.value = false
  await load()
  await nextTick()
  restoringScroll = true
  uni.pageScrollTo({
    scrollTop: positions[value],
    duration: 0,
    complete: () => {
      restoringScroll = false
    }
  })
}
/** 展开该北京时间日期中的真实卡片来源
 * @param date 已存在的打卡日期
 */
const expand = async (date: string) => {
  if (expanded.value === date && !dayError.value) {
    expanded.value = ''
    return
  }
  expanded.value = date
  day.value = null
  dayBusy.value = true
  dayError.value = ''
  try {
    const value = await session.request<components['schemas']['DailyRecords']>(
      `/api/mini/v1/me/checkins/${date}`
    )
    if (alive && expanded.value === date) day.value = value
  } catch (reason) {
    if (alive && expanded.value === date)
      dayError.value = reason instanceof Error ? reason.message : '当日记录暂未获取'
  } finally {
    if (alive && expanded.value === date) dayBusy.value = false
  }
}
/** 根据当前标签继续分页 */
const more = async () => {
  if (busy.value) return
  if (tab.value === RecordsTab.LEARNED) {
    if (learnedTotal.value === null || learned.value.length >= learnedTotal.value) return
    learnedPages++
  } else {
    if (checkinTotal.value === null || checkins.value.length >= checkinTotal.value) return
    checkinPages++
  }
  await load()
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
onReachBottom(() => {
  void more()
})
onPageScroll((event) => {
  if (!restoringScroll) currentScroll = event.scrollTop
})
onUnload(() => {
  alive = false
  generation++
})
</script>
<template>
  <AppPage title="学习记录" back>
    <LearningStatistics
      v-if="account.statistics"
      :statistics="account.statistics"
      :on-select="switchTab"
    />
    <AppState v-else :busy="!statsError" :error="statsError" @retry="loadStats" />
    <view class="tabs">
      <button
        :class="{ active: tab === RecordsTab.LEARNED }"
        @click="switchTab(RecordsTab.LEARNED)"
      >
        已学卡片 {{ learnedTotal ?? account.statistics?.completed_cards ?? '' }}
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
      :error="error"
      :empty="tab === RecordsTab.LEARNED ? learnedTotal === 0 : checkinTotal === 0"
      :title="tab === RecordsTab.LEARNED ? '还没有完成记录' : '从今天开始打卡'"
      :description="
        tab === RecordsTab.LEARNED ? '学完场景卡后点击“已完成学习”。' : '完成任意场景卡，点亮今天。'
      "
      @retry="load"
      ><button class="primary" @click="learn">去学习</button></AppState
    >
    <view v-show="tab === RecordsTab.LEARNED">
      <SceneCard v-for="card in learned" :key="card.id" :card="card" history
        ><view class="record-times"
          ><text>首次完成 {{ dateText(card.first_completed_at) }}</text
          ><text>最近学习 {{ dateText(card.last_completed_at) }}</text></view
        ></SceneCard
      >
      <button
        v-if="learnedTotal !== null && learned.length < learnedTotal"
        class="text-button more"
        :disabled="busy"
        @click="more"
      >
        {{ busy ? '加载中…' : '加载更多' }}
      </button>
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
          <SceneCard v-for="card in day?.items" :key="card.id" :card="card" history compact
            ><text class="daily-time">{{ dateText(card.completed_at) }}</text></SceneCard
          >
        </view>
      </view>
      <button
        v-if="checkinTotal !== null && checkins.length < checkinTotal"
        class="text-button more"
        :disabled="busy"
        @click="more"
      >
        {{ busy ? '加载中…' : '加载更多' }}
      </button>
    </view>
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
    font-size: 23.077rpx;
    min-height: 86.538rpx;
    color: #586c5b;

    &.active {
      color: #2b4438;
      border-bottom: 3.846rpx solid #2b4438;
    }
  }
}

.record-times {
  margin-top: 13.462rpx;

  > text {
    display: block;
    font-size: 19.231rpx;
    line-height: 1.8;
    color: #586c5b;
  }
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
