<script setup lang="ts">
defineProps<{
  expiresAt: string
  title?: string
}>()

/** 将服务端绝对时间格式化为用户所在界面可读文案，不参与权限计算。 */
function formatExpiry(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai'
  }).format(new Date(value))
}
</script>

<template>
  <view class="expiry-notice">
    <text class="expiry-notice__title">{{ title ?? '即将结束' }}</text>
    <text class="expiry-notice__time">北京时间 {{ formatExpiry(expiresAt) }}</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.expiry-notice {
  padding: 24rpx;
  border-radius: tokens.$radius-medium;
  background: #fff0d9;
  color: #87531f;

  &__title,
  &__time {
    display: block;
  }

  &__title {
    font-size: 26rpx;
    font-weight: 700;
  }

  &__time {
    margin-top: 8rpx;
    font-size: 23rpx;
  }
}
</style>
