<script setup lang="ts">
import { Routes } from '@/shared/constants/navigation'

import type { BottomTabsProps } from '@/shared/types/ui-components'
defineProps<BottomTabsProps>()
/** 切换三项一级页面，场景与收藏保留二级入口
 * @param target 当前需求注册的首页、记录或账号路径
 */
const switchTab = (target: string) => uni.switchTab({ url: target })
</script>
<template>
  <view class="bottom-tabs" role="navigation" aria-label="主导航">
    <button
      class="tab-button"
      :class="{ active: active === 'home' }"
      @click="switchTab(Routes.HOME)"
    >
      <image class="tab-icon" src="/static/design/home.svg" mode="aspectFit" /><text>首页</text>
    </button>
    <button
      class="tab-button"
      :class="{ active: active === 'records' }"
      @click="switchTab(Routes.RECORDS)"
    >
      <image class="tab-icon" src="/static/design/records.svg" mode="aspectFit" /><text
        >学习记录</text
      >
    </button>
    <button
      class="tab-button"
      :class="{ active: active === 'profile' }"
      @click="switchTab(Routes.PROFILE)"
    >
      <image class="tab-icon" src="/static/design/account.svg" mode="aspectFit" /><text>账号</text>
    </button>
  </view>
</template>
<style scoped lang="scss">
.bottom-tabs {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 16rpx;
  padding: 18rpx 30rpx max(34rpx, env(safe-area-inset-bottom));
  border-top: 1px solid #dfe5d8;
  background: #fffcf5;

  .tab-button {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    min-height: 100rpx;
    padding: 12rpx 0;
    border: 0;
    border-radius: 20rpx;
    background: transparent;
    color: #586c5b;
    font-size: 23rpx;
    line-height: 1.5;

    &::after {
      border: 0;
    }

    &.active {
      background: #e4f0db;
      color: #2b4438;
    }
  }

  .tab-icon {
    width: 38rpx;
    height: 38rpx;
  }
}
</style>
