<script setup lang="ts">
import { Routes } from '@/shared/constants/navigation'

import type { BottomTabsProps } from '@/shared/types/ui-components'

defineProps<BottomTabsProps>()
/** 切换既有一级页面，不新增业务入口
 * @param target 已注册的学习或收藏页面
 */
const switchTab = (target: string) => uni.switchTab({ url: target })
</script>
<template>
  <view class="bottom-tabs" role="navigation" aria-label="学习与收藏">
    <button
      :class="{ active: active === 'learning' }"
      :aria-current="active === 'learning' ? 'page' : undefined"
      @click="switchTab(Routes.LEARNING)"
    >
      <image
        :src="
          active === 'learning' ? '/static/design/book-active.svg' : '/static/design/book-muted.svg'
        "
        mode="aspectFit"
        aria-hidden="true"
      /><text>学习</text>
    </button>
    <button
      :class="{ active: active === 'favorites' }"
      :aria-current="active === 'favorites' ? 'page' : undefined"
      @click="switchTab(Routes.FAVORITES)"
    >
      <image
        :src="
          active === 'favorites'
            ? '/static/design/heart-active.svg'
            : '/static/design/heart-muted.svg'
        "
        mode="aspectFit"
        aria-hidden="true"
      /><text>收藏</text>
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
  gap: 34.62rpx;
  padding: 19.23rpx 46.15rpx max(53.85rpx, env(safe-area-inset-bottom));
  border-top: 1px solid #dfe5d8;
  background: #fff;

  button {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 17.31rpx;
    min-height: 82.692rpx;
    margin: 0;
    padding: 15.38rpx 19.23rpx;
    border: 0;
    border-radius: 25rpx;
    background: none;
    color: #586c5b;
    font-size: 26.92rpx;
    line-height: 1.5;

    &::after {
      border: 0;
    }

    &.active {
      background: #e4f0db;
      color: #2b4438;
      font-weight: 400;
    }
  }

  image {
    width: 44.23rpx;
    height: 44.23rpx;
  }
}
</style>
