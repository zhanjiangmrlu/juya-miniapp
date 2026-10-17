<script setup lang="ts">
import { LeaveChoice } from '@/shared/enums/profile'
withDefaults(defineProps<{ busy?: boolean; unknown?: boolean }>(), { busy: false, unknown: false })
defineEmits<{ choose: [choice: LeaveChoice] }>()
</script>
<template>
  <view class="veil" @touchmove.stop.prevent
    ><view class="dialog"
      ><text class="dialog-title">{{ unknown ? '保存结果待确认' : '资料尚未保存' }}</text
      ><text class="dialog-copy">{{
        unknown
          ? '上次保存结果尚未确认。可继续查询或重试，离开后将重新读取服务器资料。'
          : '离开前可以保存资料，或放弃本次未保存修改。'
      }}</text
      ><view class="dialog-actions"
        ><button :disabled="busy" @click="$emit('choose', LeaveChoice.CONTINUE)">继续编辑</button
        ><button :disabled="busy" @click="$emit('choose', LeaveChoice.DISCARD)">放弃修改</button
        ><button class="primary" :disabled="busy" @click="$emit('choose', LeaveChoice.SAVE)">
          保存后离开
        </button></view
      ></view
    ></view
  >
</template>
<style scoped lang="scss">
.veil {
  position: fixed;
  inset: 0;
  background: #17251c66;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.dialog {
  width: 100%;
  max-width: 650rpx;
  border-radius: 24rpx;
  background: #fffdf7;
  padding: 36rpx;

  .dialog-title {
    font-size: 36rpx;
    font-weight: 600;
    display: block;
    margin-bottom: 20rpx;
  }

  .dialog-copy {
    font-size: 26rpx;
    line-height: 1.8;
    color: #637268;
    display: block;
  }

  .dialog-actions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 32rpx;

    button {
      width: 100%;
    }
  }
}
</style>
