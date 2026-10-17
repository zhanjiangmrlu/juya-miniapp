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
  <view class="statistics"
    ><button class="stat" @click="records(RecordsTab.LEARNED)">
      <view
        ><text class="number">{{ statistics.completed_cards }}</text
        ><text class="unit">张</text></view
      ><text class="label">已学场景卡</text></button
    ><button class="stat" @click="records(RecordsTab.CHECKINS)">
      <view
        ><text class="number">{{ statistics.current_streak }}</text
        ><text class="unit">天</text></view
      ><text class="label">连续打卡</text></button
    ><button class="stat" @click="records(RecordsTab.CHECKINS)">
      <view
        ><text class="number">{{ statistics.total_checkin_days }}</text
        ><text class="unit">天</text></view
      ><text class="label">累计打卡</text>
    </button></view
  >
</template>
<style scoped lang="scss">
.statistics {
  display: flex;
  padding: 36rpx 0;
  border-bottom: 1px solid #dce2d5;

  .stat {
    display: block;
    flex: 1;
    min-width: 0;
    text-align: left;
    border: 0;
    border-radius: 0;
    background: none;
    padding: 0 0 0 28rpx;

    &:first-child {
      padding-left: 0;
    }

    & + .stat {
      border-left: 1px solid #dce2d5;
    }

    .number {
      font-size: 56rpx;
      line-height: 1.2;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }

    .unit {
      font-size: 20rpx;
      color: #637268;
      margin-left: 6rpx;
    }

    .label {
      display: block;
      margin-top: 12rpx;
      font-size: 22rpx;
      color: #637268;
    }
  }
}
</style>
