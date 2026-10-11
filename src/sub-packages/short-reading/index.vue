<script setup lang="ts">
import AppState from '@/components/app-state/app-state.vue'
import ShortReadingPageLayout from '@/features/short-reading/components/short-reading-page-layout.vue'
import { useShortReadingHistory } from '@/features/short-reading/use-short-reading-history'
import { useShortReadingList } from '@/features/short-reading/use-short-reading-list'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import {
  SHORT_READING_LIST_INTRO,
  SHORT_READING_LIST_TITLE
} from '@/shared/constants/short-reading'
import { ShortReadingAccess } from '@/shared/enums/short-reading'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

import type { ShortReadingSummary } from '@/shared/contracts/short-reading'

const { appendFailed, items, load, loading, nextCursor, open, unavailable } = useShortReadingList()
const {
  items: historyItems,
  startedCount,
  completedCount,
  nextCursor: historyCursor,
  loading: historyLoading,
  error: historyError,
  notice: historyNotice,
  openingId,
  load: loadHistory,
  open: openHistory
} = useShortReadingHistory()
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/short-reading/index')
const readable: string[] = [
  ShortReadingAccess.TRIAL,
  ShortReadingAccess.FORMAL,
  ShortReadingAccess.LIMITED
]
/** 使用当前安全摘要展示权限状态，item 为单篇短文访问摘要 */
const accessLabel = (item: ShortReadingSummary) =>
  item.progress_summary?.completed_at
    ? '已读完'
    : readable.includes(item.access)
      ? '可阅读'
      : '内容预览'
/** 从首屏重新加载模块与短文摘要 */
const reload = () => {
  void load()
}
/** 追加后台游标对应的下一页，不改变列表顺序 */
const loadMore = () => {
  void load(true)
}
/** 展示安全摘要里的最近阅读时间，value为服务端时间，不暴露阅读锚点 */
const historyTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '时间待更新'
    : new Intl.DateTimeFormat('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      }).format(date)
}
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ShortReadingPageLayout title="短文阅读">
    <scroll-view class="short-reading-list-scroll" scroll-y>
      <view class="short-reading-list">
        <text class="list-title">{{ SHORT_READING_LIST_TITLE }}</text
        ><text class="list-intro">{{ SHORT_READING_LIST_INTRO }}</text>
        <button
          v-for="item in items"
          :key="item.content_id"
          class="reading-list-card"
          @click="open(item)"
        >
          <text class="access-label">{{ accessLabel(item) }}</text>
          <image v-if="item.cover_url" class="safe-cover" :src="item.cover_url" mode="aspectFill" />
          <text class="card-title">{{ item.title_en }}</text
          ><text class="card-chinese">{{ item.title_zh }}</text
          ><text class="card-meta"
            >{{ item.category }} · {{ item.topic }} · {{ item.level }} ·
            {{ item.is_trial ? '开放试读' : accessLabel(item) }}</text
          ><text class="card-intro">{{ item.intro }}</text>
        </button>
        <text v-if="loading" class="list-loading">正在加载短文…</text>
        <AppState
          v-else-if="unavailable"
          title="短文暂不可用"
          description="请返回学习页查看已开放内容。"
          icon-label="短文不可用"
        />
        <AppState
          v-else-if="!items.length"
          title="暂时没有短文"
          description="新的阅读内容准备好后会在这里展示。"
          icon-label="暂无内容"
        />
        <button v-if="unavailable" class="list-button" @click="reload">重新加载</button>
        <button v-if="nextCursor && !loading" class="list-button" @click="loadMore">
          {{ appendFailed ? '加载失败，重试更多' : '加载更多' }}
        </button>
        <view class="reading-history">
          <text class="history-title">我的阅读记录</text>
          <text
            v-if="completedCount !== undefined && startedCount !== undefined"
            class="history-counts"
          >
            已读完 {{ completedCount }} 篇 · 已开始 {{ startedCount }} 篇
          </text>
          <button
            v-for="item in historyItems"
            :key="item.content_id"
            class="reading-list-card reading-history-card"
            :disabled="openingId !== null"
            @click="openHistory(item)"
          >
            <text class="access-label">{{ item.completed_at ? '已读完' : '阅读中' }}</text>
            <text v-if="item.title_en" class="card-title">{{ item.title_en }}</text>
            <text class="card-chinese">{{ item.title_zh || '短文阅读记录' }}</text>
            <text class="card-meta">最近阅读 {{ historyTime(item.last_read_at) }}</text>
            <text class="card-intro">{{
              item.can_open
                ? '可继续阅读'
                : openingId === item.content_id
                  ? '正在确认安全预览…'
                  : '保留阅读记录 · 查看安全预览'
            }}</text>
          </button>
          <text v-if="historyLoading" class="list-loading">正在加载阅读记录…</text>
          <text v-if="historyError" class="history-error">{{ historyError }}</text>
          <text v-if="historyNotice" class="history-error">{{ historyNotice }}</text>
          <AppState
            v-if="
              !historyLoading && !historyError && startedCount !== undefined && !historyItems.length
            "
            title="还没有阅读记录"
            description="开始阅读后，记录会保存在这里，与场景学习分别统计。"
            icon-label="暂无记录"
          />
          <button
            v-if="historyError && !historyCursor"
            class="list-button"
            :disabled="historyLoading"
            @click="loadHistory()"
          >
            重新加载阅读记录
          </button>
          <button
            v-if="historyCursor"
            class="list-button"
            :disabled="historyLoading"
            @click="loadHistory(true)"
          >
            {{ historyError ? '加载失败，重试阅读记录' : '加载更多阅读记录' }}
          </button>
        </view>
      </view>
    </scroll-view>
  </ShortReadingPageLayout>
</template>

<style scoped lang="scss">
.short-reading-list-scroll {
  height: var(--reading-scroll-height, calc(100vh - 172px));
}

.short-reading-list {
  display: flex;
  max-width: 632px;
  margin: 0 auto;
  padding: 20px;
  flex-direction: column;
  gap: 14px;

  text {
    display: block;
    overflow-wrap: anywhere;
  }

  .list-title {
    color: #254733;
    font-size: 26px;
    font-weight: 700;
    line-height: 36px;
  }

  .list-intro {
    color: #748271;
    font-size: 14px;
    line-height: 22px;
  }

  .reading-list-card {
    display: flex;
    width: 100%;
    margin: 0;
    padding: 16px;
    border: 1px solid #d9e4d2;
    border-radius: 14px;
    background: #fffdf7;
    color: #254733;
    flex-direction: column;
    gap: 8px;
    text-align: left;

    &::after {
      border: 0;
    }

    .access-label {
      min-width: 110px;
      align-self: flex-start;
      padding: 5px 14px;
      border-radius: 10px;
      background: #e2eed9;
      color: #4e7f3b;
      font-size: 11px;
      line-height: 18px;
      text-align: center;
    }

    .safe-cover {
      width: 100%;
      height: 160px;
      border-radius: 12px;
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      line-height: 25px;
    }

    .card-chinese {
      color: #748271;
      font-size: 14px;
      line-height: 22px;
    }

    .card-meta {
      color: #4e7f3b;
      font-size: 11px;
      line-height: 18px;
    }

    .card-intro {
      font-size: 14px;
      line-height: 22px;
    }
  }

  .list-button {
    width: 100%;
    min-height: 44px;
    margin: 0;
    border-radius: 12px;
    background: #e2eed9;
    color: #254733;
    font-size: 14px;
  }

  .list-loading {
    color: #748271;
    font-size: 14px;
    line-height: 22px;
  }

  .reading-history {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 12px;

    .history-title {
      color: #254733;
      font-size: 20px;
      font-weight: 700;
      line-height: 30px;
    }

    .history-counts {
      color: #4e7f3b;
      font-size: 14px;
      line-height: 22px;
    }

    .history-error {
      color: #96523a;
      font-size: 14px;
      line-height: 22px;
    }
  }
}
</style>
