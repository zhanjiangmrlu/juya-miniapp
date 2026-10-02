<script setup lang="ts">
import { ROUTES } from '@/shared/navigation/routes'

export type TabKey = 'favorites' | 'home' | 'learning' | 'profile'

withDefaults(defineProps<{ active: TabKey; appearance?: 'default' | 'home' }>(), {
  appearance: 'default'
})

const tabs = [
  { key: 'home', label: '首页', route: ROUTES.home },
  { key: 'learning', label: '学习', route: ROUTES.learning },
  { key: 'favorites', label: '收藏', route: ROUTES.favorites },
  { key: 'profile', label: '我的', route: ROUTES.profile }
] as const

/** 使用重启式导航切换一级页面，避免 Tab 历史栈持续增长。 */
function selectTab(route: string) {
  uni.reLaunch({ url: route })
}
</script>

<template>
  <view
    class="tab-bar"
    :class="{ 'home-theme': appearance === 'home' }"
    role="navigation"
    aria-label="主导航"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{
        active: active === tab.key,
        'home-item': appearance === 'home',
        'active-home': appearance === 'home' && active === tab.key
      }"
      :aria-current="active === tab.key ? 'page' : undefined"
      @click="selectTab(tab.route)"
    >
      <image
        v-if="appearance === 'home'"
        class="design-icon"
        :src="`/static/home/tab-${tab.key}.svg`"
        mode="aspectFit"
        aria-hidden="true"
      />
      <view v-else class="tab-icon" aria-hidden="true">
        <view class="icon-core" />
      </view>
      <text class="tab-label" :class="{ 'home-label': appearance === 'home' }">{{
        tab.label
      }}</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.tab-bar {
  position: fixed;
  z-index: 30;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  padding: 12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid rgb(201 222 209 / 60%);
  background: rgb(255 253 247 / 98%);
  grid-template-columns: repeat(4, 1fr);

  &.home-theme {
    min-height: 76px;
    padding: 6px 18px max(19px, env(safe-area-inset-bottom));
    border-top: 1px solid tokens.$home-border;
    background: #fffcf5;
    gap: 9px;
  }

  .design-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .tab-item {
    display: flex;
    min-height: 76rpx;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 4rpx;
    border: 0;
    background: transparent;
    color: #7a837d;
    flex-direction: column;
    line-height: 1;

    &.active {
      color: tokens.$color-primary-strong;
      font-weight: 700;
    }

    &.home-item {
      min-height: 50px;
      justify-content: flex-start;
      padding: 6px 0 0;
      border-radius: 12px;
      color: tokens.$home-muted;
      font-weight: 500;
    }

    &.active-home {
      background: tokens.$home-module;
      color: tokens.$home-ink;
    }
  }

  .tab-icon {
    display: grid;
    width: 32rpx;
    height: 32rpx;
    place-items: center;
  }

  .home-item::after {
    border: 0;
  }

  .icon-core {
    width: 18rpx;
    height: 18rpx;
    border: 3rpx solid currentcolor;
    border-radius: 5rpx;
    transform: rotate(45deg);
  }

  .tab-label {
    margin-top: 8rpx;
    font-size: 22rpx;

    &.home-label {
      margin-top: 4px;
      font-size: 11px;
      line-height: 20px;
    }
  }
}
</style>
