<script setup lang="ts">
const emit = defineEmits<{
  close: []
  retry: []
}>()

/** 关闭网络提示并保留首页品牌兜底。 */
function handleClose() {
  emit('close')
}

/** 触发页面重新执行身份与首页数据加载。 */
function handleRetry() {
  emit('retry')
}
</script>

<template>
  <view class="network-dialog" role="dialog" aria-modal="true" aria-label="网络连接异常">
    <view class="network-dialog__panel">
      <button class="network-dialog__close" aria-label="关闭" @click="handleClose">×</button>
      <view class="network-dialog__icon" aria-hidden="true">!</view>
      <text class="network-dialog__title">网络连接异常</text>
      <text class="network-dialog__description"
        >请检查网络后重新连接，学习数据不会在离线时伪造。</text
      >
      <button class="network-dialog__retry" @click="handleRetry">重新连接</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.network-dialog {
  position: fixed;
  z-index: 70;
  display: grid;
  background: rgb(34 55 46 / 48%);
  inset: 0;
  padding: 40rpx;
  place-items: center;

  &__panel {
    position: relative;
    width: 100%;
    max-width: 600rpx;
    padding: 48rpx 40rpx 40rpx;
    border-radius: tokens.$radius-large;
    background: #fffaf0;
    text-align: center;
  }

  &__close {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
    width: 64rpx;
    height: 64rpx;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: tokens.$color-text-muted;
    font-size: 44rpx;
  }

  &__icon {
    display: grid;
    width: 88rpx;
    height: 88rpx;
    place-items: center;
    margin: 0 auto;
    border-radius: 50%;
    background: #fff0d9;
    color: tokens.$color-warning;
    font-size: 48rpx;
    font-weight: 800;
  }

  &__title,
  &__description {
    display: block;
  }

  &__title {
    margin-top: 28rpx;
    font-size: 36rpx;
    font-weight: 700;
  }

  &__description {
    margin-top: 16rpx;
    color: tokens.$color-text-muted;
    font-size: 26rpx;
    line-height: 1.6;
  }

  &__retry {
    width: 100%;
    min-height: 88rpx;
    margin-top: 32rpx;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-primary;
    color: tokens.$color-white;
    font-size: 30rpx;
    font-weight: 700;
  }
}
</style>
