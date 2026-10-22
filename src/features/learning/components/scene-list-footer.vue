<script setup lang="ts">
import type { SceneListFooterProps } from '@/shared/types/learning-components'
defineProps<SceneListFooterProps>()
defineEmits<{ more: [] }>()
</script>
<template>
  <view class="list-footer" aria-live="polite"
    ><text v-if="error" class="list-error">{{ error }}</text
    ><button v-if="hasMore || error" class="text-button" :disabled="busy" @click="$emit('more')">
      {{ busy ? '加载中…' : error ? '加载失败，点击重试' : '加载更多' }}</button
    ><text v-else-if="done">已全部加载</text></view
  >
</template>
<style scoped lang="scss">
.list-footer {
  padding: 34.615rpx 0;
  text-align: center;
  color: #586c5b;
  font-size: 23.077rpx;
  line-height: 1.8;

  button {
    width: 100%;
  }

  .list-error {
    display: block;
    color: #ad4f32;
  }
}
</style>
