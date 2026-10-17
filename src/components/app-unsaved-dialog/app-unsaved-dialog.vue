<script setup lang="ts">
import { LeaveChoice } from '@/shared/enums/profile'
withDefaults(defineProps<{ busy?: boolean; unknown?: boolean }>(), { busy: false, unknown: false })
defineEmits<{ choose: [choice: LeaveChoice] }>()
</script>
<template>
  <view class="veil" @touchmove.stop.prevent
    ><view class="dialog"
      ><text class="dialog-title">{{ unknown ? '保存结果待确认' : '修改尚未保存' }}</text
      ><text class="dialog-copy">{{
        unknown
          ? '上次保存结果尚未确认。可继续查询或重试，离开后将重新读取服务器资料。'
          : '离开前，可以保存修改或放弃本次修改。'
      }}</text
      ><view class="dialog-actions"
        ><button :disabled="busy" @click="$emit('choose', LeaveChoice.CONTINUE)">继续编辑</button
        ><button class="text-button" :disabled="busy" @click="$emit('choose', LeaveChoice.DISCARD)">
          放弃修改</button
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
  background: rgb(26 40 29 / 36%);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 38.46rpx;
}

.dialog {
  width: 100%;
  max-width: 653.85rpx;
  border-radius: 26.92rpx;
  background: #fffcf5;
  padding: 48.08rpx 42.31rpx 42.31rpx;

  .dialog-title {
    font-size: 36.54rpx;
    font-weight: 500;
    line-height: 1.6;
    display: block;
    margin-bottom: 25rpx;
  }

  .dialog-copy {
    font-size: 23.08rpx;
    line-height: 1.9;
    color: #586c5b;
    display: block;
  }

  .dialog-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 15.38rpx;
    margin-top: 44.23rpx;

    button {
      flex: 1 1 146.15rpx;
      min-height: 80.77rpx;
      font-size: 23.08rpx;
      line-height: 1.6;
      padding: 17.31rpx 13.46rpx;
      white-space: normal;
    }

    .text-button {
      border: 0;
      background: none;
    }
  }
}
</style>
