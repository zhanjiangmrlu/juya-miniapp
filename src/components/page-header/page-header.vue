<script setup lang="ts">
import { resolveNavigationMetrics } from '@/services/navigation-metrics'

let metrics = resolveNavigationMetrics(undefined, undefined, 390)
try {
  const info = uni.getSystemInfoSync()
  const capsule = uni.getMenuButtonBoundingClientRect?.()
  metrics = resolveNavigationMetrics(info.statusBarHeight, capsule, info.windowWidth)
} catch {
  // H5 与测试环境缺少微信胶囊时使用设计参考尺寸
}
withDefaults(
  defineProps<{
    backLabel?: string
    centered?: boolean
    eyebrow?: string
    showBack?: boolean
    title: string
  }>(),
  {
    backLabel: '返回',
    centered: false,
    eyebrow: undefined,
    showBack: true
  }
)

/** 返回上一页；没有可返回页面时回到首页，避免用户停留在空白入口 */
const goBack = () => {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/index' }) })
}
</script>

<template>
  <view
    class="page-header"
    :class="{ centered }"
    :style="{
      paddingTop: `${metrics.top}px`,
      '--navigation-height': `${metrics.height}px`,
      '--capsule-reserve': `${metrics.right}px`
    }"
  >
    <button v-if="showBack" class="page-header__back" :aria-label="backLabel" @click="goBack">
      <image
        class="back-icon"
        src="/static/navigation/back.svg"
        mode="aspectFit"
        aria-hidden="true"
      />
    </button>
    <view
      v-else
      class="page-header__back-placeholder"
      :class="{ 'page-header__back-placeholder--hidden': !centered }"
      aria-hidden="true"
    />
    <view
      class="page-header__content"
      :class="{
        'page-header__content--leading': !showBack && !centered,
        'centered-content': centered
      }"
    >
      <text v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</text>
      <text class="page-header__title">{{ title }}</text>
    </view>
    <view class="page-header__aside">
      <slot name="aside" />
    </view>
    <!-- #ifdef H5 -->
    <view class="capsule" aria-hidden="true">
      <image class="capsule-more" src="/static/home/capsule-more.svg" mode="aspectFit" />
      <view class="capsule-divider" />
      <image class="capsule-close" src="/static/home/capsule-close.svg" mode="aspectFit" />
    </view>
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.page-header {
  position: relative;
  display: grid;
  min-height: var(--navigation-height);
  align-items: center;
  grid-template-columns: 42px minmax(0, 1fr) var(--capsule-reserve);
  margin: 0 calc(-1 * #{tokens.$space-4}) 20px;
  padding: 30px 0 0 10px;
  border-bottom: 1px solid tokens.$color-border;
  box-sizing: content-box;

  &__back {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;

    &::after {
      border: 0;
    }
  }

  .centered-content {
    justify-content: center;
    text-align: center;
  }

  .back-icon {
    display: block;
    width: 24px;
    height: 24px;
  }

  &__content {
    height: var(--navigation-height);
    display: flex;
    align-items: center;
    min-width: 0;
    text-align: left;

    &--leading {
      grid-column: 1 / 3;
      padding-left: 10px;
      text-align: left;
    }
  }

  &__eyebrow {
    display: block;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
  }

  &__title {
    display: block;
    color: tokens.$color-text;
    font-size: 17px;
    font-weight: 700;
    line-height: 32px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__aside {
    display: flex;
    justify-content: flex-end;

    &--leading {
      grid-column: 3;
    }
  }

  &__back-placeholder {
    height: var(--navigation-height);

    &--hidden {
      display: none;
    }
  }

  .capsule {
    position: absolute;
    right: 23px;
    bottom: 8px;
    display: flex;
    width: 87px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: 1px solid #e4e6db;
    border-radius: 999px;
    background: #fff;
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
    background: #e4e6db;
  }
}
</style>
