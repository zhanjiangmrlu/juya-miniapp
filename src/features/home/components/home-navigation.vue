<script setup lang="ts">
defineProps<{ unreadMessageCount: number | null }>()
const emit = defineEmits<{ openMessages: [] }>()
let statusBarHeight: number | undefined
let brandOffset: number | undefined
// #ifdef MP-WEIXIN
const windowInfo = uni.getWindowInfo()
statusBarHeight = windowInfo.statusBarHeight ?? 20
const capsuleRect = uni.getMenuButtonBoundingClientRect()
if (capsuleRect.height > 0) {
  // 品牌与系统胶囊中心对齐，保留系统胶囊在各机型上的真实位置
  brandOffset =
    capsuleRect.top +
    capsuleRect.height / 2 -
    (statusBarHeight + (47 * windowInfo.windowWidth) / 780)
}
// #endif

/** 保留站内消息入口，由页面处理跳转 */
const handleMessages = () => {
  emit('openMessages')
}
</script>

<template>
  <view
    class="home-header"
    :style="statusBarHeight === undefined ? undefined : { paddingTop: `${statusBarHeight}px` }"
  >
    <view class="navigation-row">
      <button
        class="brand"
        :style="brandOffset === undefined ? undefined : { top: `${brandOffset}px` }"
        aria-label="句芽英语，站内消息"
        @click="handleMessages"
      >
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
  padding-top: tokens.home-size(30);
  border-bottom: tokens.home-size(1) solid tokens.$home-border;

  .navigation-row {
    display: flex;
    height: tokens.home-size(47);
    align-items: center;
    justify-content: space-between;
    padding: 0 tokens.home-size(23) 0 tokens.home-size(20);
  }

  .brand {
    @include tokens.home-glyph;

    position: relative;
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    background: transparent;
    color: tokens.$home-ink;
    font-size: tokens.home-size(17);
    font-weight: 700;
    gap: tokens.home-size(8);
    line-height: tokens.home-size(30);

    &::after {
      border: 0;
    }
  }

  .unread-count {
    min-width: tokens.home-size(16);
    padding: 0 tokens.home-size(4);
    border-radius: tokens.home-size(8);
    background: tokens.$home-module;
    font-size: tokens.home-size(10);
    line-height: tokens.home-size(16);
  }

  .capsule {
    display: flex;
    width: tokens.home-size(87);
    height: tokens.home-size(32);
    align-items: center;
    justify-content: center;
    border: tokens.home-size(1) solid #e4e6db;
    border-radius: tokens.home-size(999);
    background: rgb(255 255 255 / 92%);
    box-shadow: 0 tokens.home-size(1) tokens.home-size(3) rgb(23 41 36 / 8%);
    gap: tokens.home-size(11);
  }

  .capsule-more {
    width: tokens.home-size(24);
    height: tokens.home-size(16);
  }

  .capsule-close {
    width: tokens.home-size(16);
    height: tokens.home-size(16);
  }

  .capsule-divider {
    width: tokens.home-size(1);
    height: tokens.home-size(16);
    border-radius: tokens.home-size(1);
    background: #e4e6db;
  }
}
</style>
