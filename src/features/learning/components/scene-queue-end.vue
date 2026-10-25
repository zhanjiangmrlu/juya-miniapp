<script setup lang="ts">
import { QueueSource } from '@/shared/enums/learning'

import type { SceneQueueEndProps } from '@/shared/types/learning-components'
defineProps<SceneQueueEndProps>()
defineEmits<{ learn: []; stay: [] }>()
</script>
<template>
  <view
    class="queue-veil"
    role="dialog"
    aria-modal="true"
    aria-label="本次列表已完成"
    @touchmove.stop.prevent
    ><view class="queue-dialog"
      ><text class="dialog-title">{{
        freeComplete
          ? '当前免费场景已学完'
          : source === QueueSource.FAVORITES
            ? '本次收藏列表学习已完成'
            : source === QueueSource.RECORDS || source === QueueSource.DAY
              ? '本次复习已完成'
              : '本次学习已完成'
      }}</text
      ><text class="dialog-copy">本次列表已走到最后，可以返回学习页或留在当前详情。</text
      ><view class="dialog-actions"
        ><button class="primary" @click="$emit('learn')">返回学习页</button
        ><button @click="$emit('stay')">留在当前详情</button></view
      ></view
    ></view
  >
</template>
<style scoped lang="scss">
.queue-veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48.077rpx;
  background: rgb(43 68 56 / 30%);

  .queue-dialog {
    width: 100%;
    max-width: 653.846rpx;
    padding: 48.077rpx 42.308rpx 42.308rpx;
    border-radius: 26.923rpx;
    background: #fffcf5;
  }

  .dialog-title {
    display: block;
    font-size: 36.538rpx;
    font-weight: 500;
    line-height: 58.462rpx;
    margin-bottom: 25rpx;
  }

  .dialog-copy {
    display: block;
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 43.846rpx;
  }

  .dialog-actions {
    display: flex;
    gap: 19.231rpx;
    margin-top: 44.231rpx;

    button {
      flex: 1;
      min-width: 0;
      min-height: 80.769rpx;
      padding: 17.308rpx 13.462rpx;
      border-radius: 19.231rpx;
      font-size: 23.077rpx;
      line-height: 34.615rpx;
    }
  }
}
</style>
