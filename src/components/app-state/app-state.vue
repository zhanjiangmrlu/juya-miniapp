<script setup lang="ts">
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
    ><button class="text-button" @click="$emit('retry')">重试</button></view
  ><view v-if="busy" class="loading" aria-live="polite">正在加载…</view
  ><view v-else-if="empty && !error" class="empty"
    ><view class="empty-mark"
      ><view class="empty-book"><view class="book-page" /><view class="book-spine" /></view></view
    ><text class="empty-title">{{ title || '暂无记录' }}</text
    ><text class="empty-description">{{ description }}</text
    ><slot
  /></view>
</template>
<style scoped lang="scss">
.loading {
  padding: 40rpx 0;
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

  .empty-book {
    position: relative;
    width: 46.15rpx;
    height: 38.46rpx;
    border: 1.5px solid #2b4438;
    border-radius: 2rpx;

    .book-page {
      position: absolute;
      inset: 6rpx;
      border-top: 1px solid #2b4438;
    }

    .book-spine {
      position: absolute;
      top: 0;
      left: 50%;
      height: 100%;
      border-left: 1.5px solid #2b4438;
    }
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

  button {
    margin-top: 36rpx;
  }
}
</style>
