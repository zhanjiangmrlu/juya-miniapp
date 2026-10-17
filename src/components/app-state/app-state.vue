<script setup lang="ts">
import AppLeaf from '@/components/app-leaf/app-leaf.vue'
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
    ><view class="empty-mark"><AppLeaf :size="50" /></view
    ><text class="empty-title">{{ title || '暂无记录' }}</text
    ><text class="empty-description">{{ description }}</text
    ><slot
  /></view>
</template>
<style scoped lang="scss">
.loading {
  padding: 40rpx 0;
  color: #637268;
  font-size: 26rpx;
}

.empty {
  text-align: center;
  padding: 70rpx 20rpx;
  color: #637268;

  .empty-mark {
    width: 104rpx;
    height: 104rpx;
    border: 1px solid #dce2d5;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 32rpx;
  }

  .empty-title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #254733;
    margin-bottom: 12rpx;
  }

  .empty-description {
    display: block;
    font-size: 26rpx;
    line-height: 1.9;
  }

  button {
    margin-top: 36rpx;
  }
}
</style>
