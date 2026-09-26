<script setup lang="ts">
import { APP_META } from '@/shared/constants/app-meta'
</script>

<template>
  <view class="page-shell">
    <view class="page-shell__content">
      <text class="page-shell__title">{{ APP_META.name }}</text>
      <text class="page-shell__description">{{ APP_META.description }}</text>
      <text class="page-shell__status">工程初始化完成</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page-shell {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 48rpx;

  &__content {
    display: flex;
    width: 100%;
    max-width: 640rpx;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    padding: 64rpx 40rpx;
    border-radius: 32rpx;
    background: #fff;
    box-shadow: 0 16rpx 48rpx rgb(31 41 55 / 8%);
    text-align: center;
  }

  &__title {
    color: #1f2937;
    font-size: 48rpx;
    font-weight: 600;
  }

  &__description {
    color: #64748b;
    font-size: 28rpx;
    line-height: 1.6;
  }

  &__status {
    color: #2f6fed;
    font-size: 26rpx;
  }
}
</style>
