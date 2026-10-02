<script setup lang="ts">
defineProps<{ unreadMessageCount: number | null }>()
const emit = defineEmits<{ openMessages: [] }>()
let statusBarHeight = 30
// #ifdef MP-WEIXIN
statusBarHeight = uni.getWindowInfo().statusBarHeight ?? 20
// #endif

/** 保留站内消息入口，由页面处理跳转。 */
function handleMessages() {
  emit('openMessages')
}
</script>

<template>
  <view class="home-header" :style="{ paddingTop: `${statusBarHeight}px` }">
    <view class="navigation-row">
      <button class="brand" aria-label="句芽英语，站内消息" @click="handleMessages">
        <text>句芽英语</text>
        <text v-if="unreadMessageCount" class="unread-count">{{
          unreadMessageCount > 99 ? '99+' : unreadMessageCount
        }}</text>
      </button>
      <!-- #ifdef H5 -->
      <view class="capsule" aria-hidden="true">
        <image class="capsule-more" src="/static/home/capsule-more.svg" mode="aspectFit" />
        <view class="capsule-divider" />
        <image class="capsule-close" src="/static/home/capsule-close.svg" mode="aspectFit" />
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.home-header {
  border-bottom: 1px solid tokens.$home-border;

  .navigation-row {
    display: flex;
    height: 47px;
    align-items: center;
    justify-content: space-between;
    padding: 0 23px 0 20px;
  }

  .brand {
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    background: transparent;
    color: tokens.$home-ink;
    font-size: 17px;
    font-weight: 700;
    gap: 8px;
    line-height: 30px;

    &::after {
      border: 0;
    }
  }

  .unread-count {
    min-width: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: tokens.$home-module;
    font-size: 10px;
    line-height: 16px;
  }

  .capsule {
    display: flex;
    width: 87px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: 1px solid #e4e6db;
    border-radius: 999px;
    background: rgb(255 255 255 / 92%);
    box-shadow: 0 1px 3px rgb(23 41 36 / 8%);
    gap: 11px;
  }

  .capsule-more {
    width: 24px;
    height: 16px;
  }

  .capsule-close {
    width: 16px;
    height: 16px;
  }

  .capsule-divider {
    width: 1px;
    height: 16px;
    border-radius: 1px;
    background: #e4e6db;
  }
}
</style>
