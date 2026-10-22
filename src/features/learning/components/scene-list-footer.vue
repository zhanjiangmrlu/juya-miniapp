<script setup lang="ts">
import AppLoading from '@/components/app-loading/app-loading.vue'

import type { SceneListFooterProps } from '@/shared/types/learning-components'
defineProps<SceneListFooterProps>()
defineEmits<{ more: [] }>()
</script>
<template>
  <view class="list-footer" aria-live="polite"
    ><AppLoading v-if="busy" /><template v-else-if="error"
      ><text class="list-error">{{ error }}</text
      ><button class="text-button" @click="$emit('more')">加载失败，点击重试</button></template
    ><button v-else-if="hasMore" class="text-button" @click="$emit('more')">加载更多</button
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
