<script setup lang="ts">
import { RECORDS_TAB_STORAGE_KEY } from '@/shared/constants/learning'
import { Routes } from '@/shared/constants/navigation'
import { RecordsTab } from '@/shared/enums/learning'

import type { LearningStatisticsProps } from '@/shared/types/learning-components'
const props = withDefaults(defineProps<LearningStatisticsProps>(), { showUnits: true })
/** 根据指标进入已学或打卡标签
 * @param tab 目标记录类型
 */
const records = (tab: RecordsTab) => {
  if (props.onSelect) props.onSelect(tab)
  else {
    uni.setStorageSync(RECORDS_TAB_STORAGE_KEY, tab)
    uni.switchTab({ url: Routes.RECORDS })
  }
}
</script>
<template>
  <view class="statistics">
    <button class="stat" @click="records(RecordsTab.LEARNED)">
      <text class="number">{{ statistics.completed_cards }}</text
      ><text class="label">{{ showUnits ? '已学场景卡 / 张' : '已学场景卡' }}</text>
    </button>
    <button class="stat" @click="records(RecordsTab.CHECKINS)">
      <text class="number">{{ statistics.current_streak }}</text
      ><text class="label">{{ showUnits ? '连续打卡 / 天' : '连续打卡' }}</text>
    </button>
    <button class="stat" @click="records(RecordsTab.CHECKINS)">
      <text class="number">{{ statistics.total_checkin_days }}</text
      ><text class="label">{{ showUnits ? '累计打卡 / 天' : '累计打卡' }}</text>
    </button>
  </view>
</template>
<style scoped lang="scss">
.statistics {
  display: flex;
  gap: 7.692rpx;
  padding: 30.769rpx 0;
  border-top: 1px solid #dfe5d8;
  border-bottom: 1px solid #dfe5d8;
  margin-bottom: 38.462rpx;

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    text-align: center;

    .number {
      display: block;
      width: 100%;
      text-align: center;
      padding-bottom: 7.692rpx;
      font-family: var(--app-serif-italic-font, Fraunces, Georgia, serif);
      font-style: italic;
      font-size: 57.692rpx;
      font-weight: 400;
      line-height: 72.115rpx;
      letter-spacing: -0.02em;
    }

    .label {
      display: block;
      width: 100%;
      text-align: center;
      font-size: 21.154rpx;
      font-weight: 400;
      line-height: 33.846rpx;
      color: #586c5b;
      white-space: nowrap;
    }
  }
}
</style>
