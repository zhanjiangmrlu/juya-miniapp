<script setup lang="ts">
import AppLoading from '@/components/app-loading/app-loading.vue'

defineProps<{
  busy?: boolean
  error?: string
  empty?: boolean
  title?: string
  description?: string
}>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <view v-if="error" class="notice error"
    ><text>{{ error }}</text
    ><button class="text-button notice-retry" @click="$emit('retry')">重试</button></view
  ><view v-else-if="busy" class="loading"><AppLoading /></view
  ><view v-else-if="empty && !error" class="empty"
    ><view class="empty-mark"
      ><image
        class="empty-icon"
        src="/static/design/empty-book.svg"
        mode="aspectFit"
        aria-hidden="true" /></view
    ><text class="empty-title">{{ title || '暂无记录' }}</text
    ><text class="empty-description">{{ description }}</text
    ><slot
  /></view>
</template>
<style scoped lang="scss">
.loading {
  padding: 40rpx 0;
  text-align: center;
  color: #586c5b;
  font-size: 23.08rpx;
}

.empty {
  text-align: center;
  padding: 92.31rpx 15.38rpx 69.23rpx;
  color: #586c5b;

  .empty-mark {
    width: 96.15rpx;
    height: 96.15rpx;
    border: 0;
    background: #e4f0db;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 32rpx;
  }

  .empty-icon {
    width: 48.077rpx;
    height: 48.077rpx;
  }

  .empty-title {
    display: block;
    font-size: 34.62rpx;
    font-weight: 500;
    color: #2b4438;
    margin-bottom: 19.23rpx;
  }

  .empty-description {
    display: block;
    font-size: 23.08rpx;
    line-height: 1.9;
  }

  .notice-retry {
    margin-top: 36rpx;
  }
}
</style>
