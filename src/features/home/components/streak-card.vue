<script setup lang="ts">
import type { CheckinSummary } from '@/shared/contracts/home'

defineProps<{ checkins: CheckinSummary | null }>()
</script>

<template>
  <view class="streak-card">
    <view class="streak-card__header">
      <view>
        <text class="streak-card__label">连续学习</text>
        <view class="streak-card__number-row">
          <text class="streak-card__flame" aria-label="连续学习">🔥</text>
          <text class="streak-card__number">{{ checkins?.current_streak ?? '—' }}</text>
          <text class="streak-card__unit">天</text>
        </view>
      </view>
      <text class="streak-card__status">{{ checkins ? '保持得很好' : '等待连接' }}</text>
    </view>
    <view class="streak-card__metrics">
      <view class="streak-card__metric">
        <text class="streak-card__metric-value">{{ checkins?.total_days ?? '—' }}</text>
        <text class="streak-card__metric-label">累计天数</text>
      </view>
      <view class="streak-card__metric">
        <text class="streak-card__metric-value">{{ checkins?.longest_streak ?? '—' }}</text>
        <text class="streak-card__metric-label">最长连续</text>
      </view>
      <view class="streak-card__metric">
        <text class="streak-card__metric-value">—</text>
        <text class="streak-card__metric-label">完成场景</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.streak-card {
  margin-top: tokens.$space-4;
  padding: 32rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(227 239 230 / 78%);

  &__header,
  &__number-row {
    display: flex;
    align-items: center;
  }

  &__header {
    justify-content: space-between;
  }

  &__label {
    display: block;
    font-size: 28rpx;
  }

  &__number-row {
    margin-top: 2rpx;
  }

  &__flame {
    margin-right: 10rpx;
    font-size: 50rpx;
  }

  &__number {
    font-size: 76rpx;
    font-weight: 800;
    line-height: 1;
  }

  &__unit {
    margin: 28rpx 0 0 8rpx;
    font-size: 24rpx;
  }

  &__status {
    padding: 10rpx 16rpx;
    border-radius: tokens.$radius-pill;
    background: #fff1d8;
    color: #9b6427;
    font-size: 22rpx;
  }

  &__metrics {
    display: grid;
    margin-top: 28rpx;
    gap: tokens.$space-2;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  &__metric {
    padding: 20rpx;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 76%);
  }

  &__metric-value,
  &__metric-label {
    display: block;
  }

  &__metric-value {
    font-size: 34rpx;
    font-weight: 750;
  }

  &__metric-label {
    margin-top: 8rpx;
    color: tokens.$color-text-muted;
    font-size: 20rpx;
  }
}
</style>
