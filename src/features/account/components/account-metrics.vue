<script setup lang="ts">
import type { AccountMetricsProps } from '@/shared/types/account-components'

defineProps<AccountMetricsProps>()
</script>

<template>
  <view class="account-metrics">
    <text class="account-metrics__headline">你已经学习了 {{ totalDays }} 天</text>
    <view class="account-metrics__grid">
      <view class="account-metrics__item">
        <text class="account-metrics__value">{{ longestStreak }}</text>
        <text class="account-metrics__label">最长连续</text>
      </view>
      <view class="account-metrics__item">
        <text class="account-metrics__value">{{ favoriteCount }}</text>
        <text class="account-metrics__label">收藏</text>
      </view>
      <view class="account-metrics__item">
        <text class="account-metrics__value">{{ completedScenes }}</text>
        <text class="account-metrics__label">完成场景</text>
      </view>
      <view class="account-metrics__item">
        <text class="account-metrics__value">{{ validEntitlements }}</text>
        <text class="account-metrics__label">有效权益</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.account-metrics {
  padding: 34rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: tokens.$color-module;

  &__headline {
    display: block;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
  }

  &__grid {
    display: grid;
    margin-top: 28rpx;
    gap: 16rpx;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__item {
    padding: 20rpx;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 72%);
  }

  &__value,
  &__label {
    display: block;
  }

  &__value {
    font-size: 34rpx;
    font-weight: 700;
  }

  &__label {
    margin-top: 4rpx;
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }
}
</style>
