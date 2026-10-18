<script setup lang="ts">
import type { ProfileLogoutDialogProps } from '@/shared/types/profile-components'

defineProps<ProfileLogoutDialogProps>()
defineEmits<{ cancel: []; confirm: [] }>()
</script>
<template>
  <view
    class="logout-dialog"
    role="dialog"
    aria-modal="true"
    aria-label="退出当前账号"
    @touchmove.stop.prevent
  >
    <view class="dialog">
      <text class="dialog-title">退出当前账号？</text>
      <text class="dialog-copy">退出后需重新登录，学习记录和收藏会继续保留。</text>
      <text v-if="error" class="dialog-error" role="alert">{{ error }}</text>
      <view class="dialog-actions">
        <button class="cancel" :disabled="busy" @click="$emit('cancel')">取消</button>
        <button class="confirm" :disabled="busy" :loading="busy" @click="$emit('confirm')">
          {{ busy ? '正在退出…' : '退出登录' }}
        </button>
      </view>
    </view>
  </view>
</template>
<style scoped lang="scss">
.logout-dialog {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 38.462rpx;
  background: #2b4438;

  .dialog {
    width: 100%;
    max-width: 653.846rpx;
    padding: 48.077rpx 42.308rpx 42.308rpx;
    border-radius: 26.923rpx;
    background: #fffcf5;
  }

  .dialog-title {
    display: block;
    margin-bottom: 25rpx;
    font-size: 36.538rpx;
    font-weight: 500;
    line-height: 58.462rpx;
  }

  .dialog-copy,
  .dialog-error {
    display: block;
    font-size: 23.077rpx;
    line-height: 43.846rpx;
    color: #586c5b;
  }

  .dialog-error {
    margin-top: 15.385rpx;
    color: #ad4f32;
  }

  .dialog-actions {
    display: flex;
    gap: 15.385rpx;
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

  .confirm {
    border-color: #ad4f32;
    background: #ad4f32;
    color: #fff;
  }
}
</style>
