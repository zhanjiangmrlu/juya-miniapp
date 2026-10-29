<script setup lang="ts">
import { onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'
import ListeningCollection from '@/features/listening/components/listening-collection.vue'
import { session } from '@/services/api'
import { dateText } from '@/services/display'
import { RECORDS_TAB_STORAGE_KEY } from '@/shared/constants/learning'
import { LISTENING_API } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { RecordsTab } from '@/shared/enums/learning'
import { ListeningTimestampKind } from '@/shared/enums/listening'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { ListeningSummary } from '@/shared/types/listening'
const account = useAccountStore(),
  tab = ref<RecordsTab>(RecordsTab.LEARNED),
  expanded = ref(''),
  dayBusy = ref(false),
  dayError = ref(''),
  day = ref<{
    scene_items: components['schemas']['DailyRecord'][]
    article_items: ListeningSummary[]
  } | null>(null),
  stats = ref<
    | (components['schemas']['Statistics'] & {
        completed_articles: number
        today_completed_articles: number
      })
    | null
  >(null),
  statsError = ref('')
const scenes = useSceneList<components['schemas']['LearningRecord']>({
  path: '/api/mini/v1/me/learning-records',
  request: session.request,
  userId: session.userId,
  ensure: () => account.ensure(Routes.RECORDS)
})
const checkins = useSceneList<{ date: string; card_count: number; article_count: number }>({
  path: `${LISTENING_API}/checkins`,
  request: session.request,
  userId: session.userId,
  ensure: () => account.ensure(Routes.RECORDS),
  key: (row) => row.date
})
const current = computed(() => (tab.value === RecordsTab.CHECKINS ? checkins : scenes))
/** 读取分模块成绩及同一北京时间自然日打卡统计 */
const loadStats = async () => {
  try {
    stats.value = await session.request(`${LISTENING_API}/statistics`)
    statsError.value = ''
  } catch (reason) {
    statsError.value = reason instanceof Error ? reason.message : '统计暂未获取'
  }
}
/** 刷新当前记录标签，失败保留已读取页 */
const load = async () => {
  if (await account.ensure(Routes.RECORDS)) {
    await Promise.all([
      loadStats(),
      tab.value === RecordsTab.LISTENING ? Promise.resolve() : current.value.refresh()
    ])
  }
}
/** 打开某日两类明细，迟到结果不能覆盖新日期
 * @param date 服务端北京时间日期
 */
const expand = async (date: string) => {
  if (expanded.value === date && !dayError.value) {
    expanded.value = ''
    return
  }
  expanded.value = date
  day.value = null
  dayError.value = ''
  dayBusy.value = true
  try {
    const result = await session.request<NonNullable<typeof day.value>>(
      `${LISTENING_API}/checkins/${date}`
    )
    if (expanded.value === date) day.value = result
  } catch (reason) {
    if (expanded.value === date)
      dayError.value = reason instanceof Error ? reason.message : '当日明细暂未获取'
  } finally {
    if (expanded.value === date) dayBusy.value = false
  }
}
/** 同页选择已学场景、已学听读或共同打卡
 * @param value 目标标签
 */
const select = (value: RecordsTab) => {
  tab.value = value
  uni.setStorageSync(RECORDS_TAB_STORAGE_KEY, value)
  if (value !== RecordsTab.LISTENING) void current.value.refresh()
}
onShow(() => {
  uni.hideTabBar({ animation: false, fail: () => undefined })
  const stored = uni.getStorageSync(RECORDS_TAB_STORAGE_KEY)
  if (Object.values(RecordsTab).includes(stored)) tab.value = stored
  void load()
})
onReachBottom(() => {
  if (tab.value !== RecordsTab.LISTENING) void current.value.more()
})
onUnload(() => {
  scenes.dispose()
  checkins.dispose()
})
</script>
<template>
  <AppPage title="学习记录" footer
    ><view v-if="stats" class="record-summary"
      ><view class="statistics">
        <button class="metric" @click="select(RecordsTab.LEARNED)">
          <text class="metric-number">{{ stats.completed_cards }}</text
          ><text class="metric-label">已学场景卡 / 张</text>
        </button>
        <button class="metric" @click="select(RecordsTab.LISTENING)">
          <text class="metric-number">{{ stats.completed_articles }}</text
          ><text class="metric-label">已学听读 / 篇</text>
        </button> </view
      ><view class="checkin-summary"
        ><text
          >连续打卡<text class="checkin-number">{{ stats.current_streak }}</text
          >天</text
        ><text
          >累计打卡<text class="checkin-number">{{ stats.total_checkin_days }}</text
          >天</text
        ></view
      >
      <view class="today-state"
        ><image
          class="checkin-icon"
          src="/static/design/home-checkin.svg"
          mode="aspectFit"
        /><text>{{ stats.checked_in_today ? '今日已打卡' : '今日待打卡' }}</text></view
      ></view
    >
    ><AppState v-if="statsError" :error="statsError" @retry="loadStats" /><view class="tabs"
      ><button
        class="tab-button"
        :class="{ active: tab === RecordsTab.LEARNED }"
        @click="select(RecordsTab.LEARNED)"
      >
        已学场景</button
      ><button
        class="tab-button"
        :class="{ active: tab === RecordsTab.LISTENING }"
        @click="select(RecordsTab.LISTENING)"
      >
        已学听读</button
      ><button
        class="tab-button"
        :class="{ active: tab === RecordsTab.CHECKINS }"
        @click="select(RecordsTab.CHECKINS)"
      >
        打卡记录
      </button></view
    ><ListeningCollection v-if="tab === RecordsTab.LISTENING" mode="records" /><view v-else
      ><AppState
        :busy="current.busy.value && current.total.value === null"
        :error="current.error.value"
        :empty="current.total.value === 0"
        title="完成学习后，记录会留在这里"
        @retry="load" /><template v-if="tab === RecordsTab.LEARNED"
        ><SceneCard
          v-for="card in scenes.items.value"
          :key="card.id"
          :card="card"
          history
          source="records" /></template
      ><template v-else
        ><view v-for="record in checkins.items.value" :key="record.date" class="day"
          ><button class="day-heading" @click="expand(record.date)">
            <text>{{ record.date }}</text
            ><text
              >场景 {{ record.card_count }} 张 · 听读 {{ record.article_count }} 篇</text
            ></button
          ><view v-if="expanded === record.date"
            ><AppState :busy="dayBusy" :error="dayError" @retry="expand(record.date)" /><SceneCard
              v-for="card in day?.scene_items"
              :key="card.id"
              :card="card"
              history
              source="day"
              :day="record.date"
              ><text class="muted">{{ dateText(card.completed_at) }}</text></SceneCard
            ><ListeningArticleCard
              v-for="article in day?.article_items"
              :key="article.id"
              :article="article"
              :timestamp="ListeningTimestampKind.DAILY" /></view></view></template
      ><SceneListFooter
        :busy="current.moreBusy.value"
        :error="current.moreError.value"
        :has-more="current.hasMore.value"
        :done="current.done.value"
        @more="current.more" /></view
    ><AppBottomTabs active="records"
  /></AppPage>
</template>
<style scoped lang="scss">
.statistics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid #dfe5d8;
  border-bottom: 1px solid #dfe5d8;
  padding: 34.615rpx 0;

  .metric {
    display: flex;
    flex-direction: column;
    gap: 11.538rpx;
    border: 0;
    padding: 0;
    background: transparent;
    border-radius: 0;
    min-height: 114rpx;
  }

  .metric-number {
    font-family: var(--app-serif-italic-font, Fraunces, Georgia, serif);
    font-style: italic;
    font-size: 67.308rpx;
    font-weight: 400;
    line-height: 1.25;
  }

  .metric-label {
    font-size: 23.077rpx;
    color: #586c5b;
  }
}

.checkin-summary {
  display: flex;
  justify-content: center;
  gap: 30.769rpx;
  margin-top: 26.923rpx;
  font-size: 23.077rpx;
  color: #586c5b;

  .checkin-number {
    margin: 0 8rpx;
    font-weight: 700;
  }
}

.today-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11.538rpx;
  margin: 19.231rpx 0 36.538rpx;
  font-size: 23.077rpx;
  color: #586c5b;

  .checkin-icon {
    width: 13px;
    height: 13px;
  }
}

.tabs {
  display: flex;
  border-bottom: 1px solid #dfe5d8;

  .tab-button {
    flex: 1;
    min-height: 48px;
    padding: 15rpx 4rpx;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    font-size: 25rpx;
    color: #586c5b;

    &.active {
      border-bottom-color: #2b4438;
      color: #2b4438;
      font-weight: 700;
    }
  }
}

.day {
  padding: 24rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .day-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12rpx;
    width: 100%;
    padding: 12rpx 0;
    background: transparent;
    border: 0;
    text-align: left;
    font-size: 24rpx;
  }
}
</style>
