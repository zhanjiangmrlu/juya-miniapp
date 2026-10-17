<script setup lang="ts">
import { Routes } from '@/shared/constants/navigation'
import { RecordsTab } from '@/shared/enums/learning'

import type { LearningStatisticsProps } from '@/shared/types/learning-components'
const props = defineProps<LearningStatisticsProps>()
/** 根据指标进入已学或打卡标签
 * @param tab 目标记录类型
 */
const records = (tab: RecordsTab) => {
  if (props.onSelect) props.onSelect(tab)
  else uni.navigateTo({ url: `${Routes.RECORDS}?tab=${tab}` })
}
</script>
<template>
  <view class="statistics">
    <button class="stat" @click="records(RecordsTab.LEARNED)">
      <text class="number">{{ statistics.completed_cards }}</text
      ><text class="label">已学场景卡 / 张</text>
    </button>
    <button class="stat" @click="records(RecordsTab.CHECKINS)">
      <text class="number">{{ statistics.current_streak }}</text
      ><text class="label">连续打卡 / 天</text>
    </button>
    <button class="stat" @click="records(RecordsTab.CHECKINS)">
      <text class="number">{{ statistics.total_checkin_days }}</text
      ><text class="label">累计打卡 / 天</text>
    </button>
  </view>
</template>
<style scoped lang="scss">
.statistics {
  display: flex;
  gap: 7.692rpx;
  padding: 32.692rpx 0 28.846rpx;
  border-top: 1px solid #dfe5d8;
  border-bottom: 1px solid #dfe5d8;
  margin-bottom: 38.462rpx;

  .stat {
    display: block;
    flex: 1;
    min-width: 0;
    text-align: left;
    border: 0;
    border-radius: 0;
    background: none;
    padding: 0;

    & + .stat {
      padding-left: 15.385rpx;
    }

    .number {
      display: block;
      font-family: Fraunces, Georgia, serif;
      font-style: italic;
      font-size: 57.692rpx;
      line-height: 1.25;
      font-weight: 500;
      letter-spacing: -0.02em;
      padding-bottom: 7.692rpx;
    }

    .label {
      display: block;
      font-size: 21.154rpx;
      line-height: 1.6;
      color: #586c5b;
      white-space: nowrap;
    }
  }
}
</style>
