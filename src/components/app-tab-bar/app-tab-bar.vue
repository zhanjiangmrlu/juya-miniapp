<script setup lang="ts">
import { ROUTES } from '@/shared/navigation/routes'

export type TabKey = 'favorites' | 'home' | 'learning' | 'profile'

defineProps<{ active: TabKey }>()

const tabs = [
  { key: 'home', label: '首页', route: ROUTES.home },
  { key: 'learning', label: '学习', route: ROUTES.learning },
  { key: 'favorites', label: '收藏', route: ROUTES.favorites },
  { key: 'profile', label: '我的', route: ROUTES.profile }
] as const

function selectTab(route: string) {
  uni.reLaunch({ url: route })
}
</script>

<template>
  <view class="app-tab-bar" role="navigation" aria-label="主导航">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="app-tab-bar__item"
      :class="{ 'app-tab-bar__item--active': active === tab.key }"
      :aria-current="active === tab.key ? 'page' : undefined"
      @click="selectTab(tab.route)"
    >
      <view class="app-tab-bar__icon" aria-hidden="true">
        <view class="app-tab-bar__icon-core" />
      </view>
      <text class="app-tab-bar__label">{{ tab.label }}</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.app-tab-bar {
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

  &__item {
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

    &--active {
      color: tokens.$color-primary-strong;
      font-weight: 700;
    }
  }

  &__icon {
    display: grid;
    width: 32rpx;
    height: 32rpx;
    place-items: center;
  }

  &__icon-core {
    width: 18rpx;
    height: 18rpx;
    border: 3rpx solid currentcolor;
    border-radius: 5rpx;
    transform: rotate(45deg);
  }

  &__label {
    margin-top: 8rpx;
    font-size: 22rpx;
  }
}
</style>
