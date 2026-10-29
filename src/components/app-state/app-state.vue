<script setup lang="ts">
import AppLoading from '@/components/app-loading/app-loading.vue'

defineProps<{
  prominent?: boolean
  icon?: string
  iconSize?: number
  actionLabel?: string
  centeredError?: boolean
  busy?: boolean
  error?: string
  empty?: boolean
  title?: string
  description?: string
}>()
defineEmits<{ retry: []; action: [] }>()
</script>
<template>
  <view v-if="error && !centeredError" class="notice error"
    ><text>{{ error }}</text
    ><button class="text-button notice-retry" @click="$emit('retry')">重试</button></view
  ><view v-else-if="busy" class="loading"><AppLoading /></view
  ><view
    v-else-if="empty || (error && centeredError)"
    class="empty"
    :class="{ prominent: prominent || centeredError }"
    ><view class="empty-mark"
      ><image
        class="empty-icon"
        :style="iconSize ? { width: `${iconSize}px`, height: `${iconSize}px` } : undefined"
        :src="icon || (error ? '/static/listening/r17-retry.svg' : '/static/design/empty-book.svg')"
        mode="aspectFit"
        aria-hidden="true" /></view
    ><text class="empty-title">{{ title || (error ? '加载失败' : '暂无记录') }}</text
    ><text class="empty-description">{{ error || description }}</text
    ><button v-if="error" class="state-retry" @click="$emit('retry')">重新加载</button
    ><button
      v-if="actionLabel"
      class="state-action"
      data-action="state-action"
      @click="$emit('action')"
    >
      {{ actionLabel }}</button
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

  &.prominent {
    padding-top: 125rpx;

    .empty-mark {
      width: 123.077rpx;
      height: 123.077rpx;
    }

    .empty-icon {
      width: 28px;
      height: 28px;
    }

    .empty-title {
      font-size: 36.538rpx;
      font-weight: 700;
    }
  }

  .state-action,
  .state-retry {
    min-height: 44px;
    margin: 38rpx auto 0;
    padding: 14rpx 26rpx;
    background: #fff;
    font-size: 26.923rpx;
    border: 1px solid #dfe5d8;
  }

  .notice-retry {
    margin-top: 36rpx;
  }
}
</style>
