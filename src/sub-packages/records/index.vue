<script setup lang="ts">
import { onLoad, onPageScroll, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { nextTick, ref } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import LearningStatistics from '@/features/learning/components/learning-statistics.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import { onSessionExpired, session } from '@/services/api'
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
  moreBusy = ref(false),
  moreError = ref(''),
  learnedDone = ref(false),
  checkinDone = ref(false),
  error = ref(''),
  statsError = ref(''),
  expanded = ref(''),
  day = ref<components['schemas']['DailyRecords'] | null>(null),
  dayBusy = ref(false),
  dayError = ref('')
let learnedPages = 1,
  checkinPages = 1,
  generation = 0,
  dayGeneration = 0,
  owner = session.userId(),
  alive = true,
  currentScroll = 0,
  restoringScroll = false
const positions = { learned: 0, checkins: 0 }
/** 会话变化时清除私人记录、展开项和旧请求，不删除服务器成绩 */
const reset = () => {
  generation++
  dayGeneration++
  learned.value = []
  checkins.value = []
  learnedTotal.value = null
  checkinTotal.value = null
  learnedPages = 1
  checkinPages = 1
  learnedDone.value = false
  checkinDone.value = false
  busy.value = false
  moreBusy.value = false
  error.value = ''
  moreError.value = ''
  expanded.value = ''
  day.value = null
  dayBusy.value = false
  dayError.value = ''
  positions.learned = 0
  positions.checkins = 0
  owner = session.userId()
}
const unsubscribe = onSessionExpired(reset)
/** 分别刷新两个标签已加载的范围，不修改任何成绩 */
const load = async () => {
  if (owner !== session.userId()) reset()
  if (busy.value || moreBusy.value) return
  busy.value = true
  error.value = ''
  const run = ++generation,
    view = tab.value
  try {
    if (!(await account.ensure(Routes.RECORDS)) || !alive || run !== generation) return
    owner = session.userId()
    if (view === RecordsTab.LEARNED) {
      const results = await Promise.all(
        Array.from({ length: learnedPages }, (_, index) =>
          session.request<components['schemas']['Page_LearningRecord_']>(
            `/api/mini/v1/me/learning-records?page=${index + 1}&limit=20`
          )
        )
      )
      if (alive && run === generation && owner === session.userId()) {
        learned.value = [
          ...new Map(
            results.flatMap((result) => result.items).map((item) => [item.id, item])
          ).values()
        ]
        learnedTotal.value = results[0]?.total ?? 0
        const last = results.at(-1)
        learnedDone.value = last ? last.page * last.limit >= last.total : false
        moreError.value = ''
      }
    } else {
      const results = await Promise.all(
        Array.from({ length: checkinPages }, (_, index) =>
          session.request<components['schemas']['Page_CheckinRecord_']>(
            `/api/mini/v1/me/checkins?page=${index + 1}&limit=20`
          )
        )
      )
      if (alive && run === generation && owner === session.userId()) {
        checkins.value = [
          ...new Map(
            results.flatMap((result) => result.items).map((item) => [item.date, item])
          ).values()
        ]
        checkinTotal.value = results[0]?.total ?? 0
        const last = results.at(-1)
        checkinDone.value = last ? last.page * last.limit >= last.total : false
        moreError.value = ''
      }
    }
  } catch (reason) {
    if (alive && run === generation && owner === session.userId())
      error.value = reason instanceof Error ? reason.message : '记录暂未获取'
  } finally {
    if (alive && run === generation && owner === session.userId()) busy.value = false
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
  moreBusy.value = false
  moreError.value = ''
  const run = generation
  await load()
  await nextTick()
  if (!alive || tab.value !== value || generation !== run + 1) return
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
  const run = ++dayGeneration,
    accountId = session.userId()
  expanded.value = date
  day.value = null
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
    if (alive && run === dayGeneration && accountId === session.userId() && expanded.value === date)
      dayBusy.value = false
  }
}
/** 只追加当前标签下一页，失败保留原位置并重试同一页 */
const more = async () => {
  if (owner !== session.userId()) {
    reset()
    return
  }
  const view = tab.value,
    isLearned = view === RecordsTab.LEARNED,
    total = isLearned ? learnedTotal.value : checkinTotal.value
  if (
    busy.value ||
    moreBusy.value ||
    total === null ||
    (isLearned ? learnedDone.value : checkinDone.value)
  )
    return
  const page = (isLearned ? learnedPages : checkinPages) + 1,
    run = generation,
    accountId = session.userId()
  moreBusy.value = true
  moreError.value = ''
  try {
    if (!(await account.ensure(Routes.RECORDS)) || !alive || run !== generation) return
    if (isLearned) {
      const result = await session.request<components['schemas']['Page_LearningRecord_']>(
        `/api/mini/v1/me/learning-records?page=${page}&limit=20`
      )
      if (!alive || run !== generation || accountId !== session.userId()) return
      learned.value = [
        ...new Map([...learned.value, ...result.items].map((item) => [item.id, item])).values()
      ]
      learnedTotal.value = result.total
      learnedDone.value = result.page * result.limit >= result.total
      learnedPages = page
    } else {
      const result = await session.request<components['schemas']['Page_CheckinRecord_']>(
        `/api/mini/v1/me/checkins?page=${page}&limit=20`
      )
      if (!alive || run !== generation || accountId !== session.userId()) return
      checkins.value = [
        ...new Map([...checkins.value, ...result.items].map((item) => [item.date, item])).values()
      ]
      checkinTotal.value = result.total
      checkinDone.value = result.page * result.limit >= result.total
      checkinPages = page
    }
  } catch (reason) {
    if (alive && run === generation && accountId === session.userId())
      moreError.value = reason instanceof Error ? reason.message : '加载更多失败'
  } finally {
    if (alive && run === generation) moreBusy.value = false
  }
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
  dayGeneration++
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
      :error="
        error &&
        ((tab === RecordsTab.LEARNED ? learnedTotal : checkinTotal) === null
          ? error
          : `记录暂未更新：${error}`)
      "
      :empty="tab === RecordsTab.LEARNED ? learnedTotal === 0 : checkinTotal === 0"
      title="完成一张场景卡，开始记录学习"
      :description="
        tab === RecordsTab.LEARNED ? '学完场景卡后点击“已完成学习”。' : '完成任意场景卡，点亮今天。'
      "
      @retry="load"
      ><button class="primary" @click="learn">去学习</button></AppState
    >
    <view
      v-if="busy && (tab === RecordsTab.LEARNED ? learnedTotal !== null : checkinTotal !== null)"
      class="refreshing"
      ><AppLoading label="正在刷新"
    /></view>
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
      :error="moreError"
      :has-more="
        tab === RecordsTab.LEARNED
          ? learnedTotal !== null && !learnedDone
          : checkinTotal !== null && !checkinDone
      "
      :done="
        tab === RecordsTab.LEARNED
          ? learnedTotal !== null && learnedTotal > 0 && learnedDone
          : checkinTotal !== null && checkinTotal > 0 && checkinDone
      "
      @more="more"
    />
  </AppPage>
</template>
<style scoped lang="scss">
.refreshing {
  padding: 19.231rpx 0;
  color: #586c5b;
  font-size: 23.077rpx;
  text-align: center;
}

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
