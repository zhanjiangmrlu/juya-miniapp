<script setup lang="ts">
import { LeaveChoice } from '@/shared/enums/profile'
withDefaults(defineProps<{ unknown?: boolean }>(), { unknown: false })
defineEmits<{ choose: [choice: LeaveChoice] }>()
</script>
<template>
  <view class="feedback-leave-veil" @touchmove.stop.prevent
    ><view class="feedback-leave-dialog"
      ><text class="dialog-title">{{ unknown ? '提交结果待确认' : '反馈尚未提交' }}</text
      ><text class="dialog-copy">{{
        unknown
          ? '离开不会取消服务器提交。本人的恢复快照会暂留内存，重新进入先查询结果；不会另建重复操作。'
          : '离开前，可以继续编辑或放弃本次输入。'
      }}</text
      ><view class="dialog-actions"
        ><button class="primary" @click="$emit('choose', LeaveChoice.CONTINUE)">
          {{ unknown ? '继续确认' : '继续编辑' }}</button
        ><button @click="$emit('choose', LeaveChoice.DISCARD)">
          {{ unknown ? '离开并保留待确认操作' : '放弃本次输入' }}
        </button></view
      ></view
    ></view
  >
</template>
<style scoped lang="scss">
.feedback-leave-veil {
  position: fixed;
  inset: 0;
  background: rgb(43 68 56 / 30%);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 38.462rpx;

  .feedback-leave-dialog {
    width: 100%;
    max-width: 653.846rpx;
    background: #fffcf5;
    padding: 46.154rpx;
    border-radius: 26.923rpx;
  }

  .dialog-title {
    display: block;
    font-size: 34.615rpx;
    font-weight: 500;
    margin-bottom: 23.077rpx;
  }

  .dialog-copy {
    display: block;
    font-size: 26.923rpx;
    line-height: 1.8;
  }

  .dialog-actions {
    display: flex;
    flex-direction: column;
    gap: 19.231rpx;
    margin-top: 30.769rpx;
  }
}
</style>
