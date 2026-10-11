<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import AppTabBar from '@/components/app-tab-bar/app-tab-bar.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import tabletBack from '@/features/short-reading/assets/tablet-back.svg'
import { resolveNavigationMetrics } from '@/services/navigation-metrics'
import { APP_TABS } from '@/shared/constants/navigation'
import { TabKey } from '@/shared/enums/navigation'
import { PageTier } from '@/shared/enums/ui'

import type { ShortReadingLayoutProps } from '@/shared/types/short-reading-components'

defineProps<ShortReadingLayoutProps>()
let headerHeight = 78
try {
  const info = uni.getWindowInfo()
  const metrics = resolveNavigationMetrics(
    info.statusBarHeight,
    uni.getMenuButtonBoundingClientRect?.(),
    info.windowWidth
  )
  headerHeight = metrics.top + metrics.height
} catch {
  // H5和组件预览使用390px母版的导航高度
}
/** 返回上一页，无历史页面时回到独立短文列表 */
const goBack = () =>
  uni.navigateBack({ fail: () => uni.redirectTo({ url: '/sub-packages/short-reading/index' }) })
/** 切换平板一级页面，route 为四项主导航的已注册路径 */
const selectTab = (route: string) => uni.reLaunch({ url: route })
</script>

<template>
  <AppPage
    class="short-reading-layout"
    :padded="false"
    :tier="PageTier.SECONDARY"
    :style="{ '--reading-mobile-header-height': `${headerHeight}px` }"
  >
    <view class="reading-header">
      <PageHeader :title="title" />
    </view>
    <view class="tablet-header"
      ><button class="tablet-back" aria-label="返回" @click="goBack">
        <image :src="tabletBack" mode="aspectFit" /></button
      ><text class="tablet-title">{{ title }}</text
      ><slot name="audio"
    /></view>
    <view class="reading-content"><slot /></view>
    <view class="mobile-navigation"><AppTabBar :active="TabKey.LEARNING" /></view>
    <view class="tablet-navigation" role="navigation" aria-label="主导航"
      ><button
        v-for="tab in APP_TABS"
        :key="tab.key"
        :class="{ active: tab.key === TabKey.LEARNING }"
        :aria-current="tab.key === TabKey.LEARNING ? 'page' : undefined"
        @click="selectTab(tab.route)"
      >
        {{ tab.label }}
      </button></view
    >
  </AppPage>
</template>

<style scoped lang="scss">
.short-reading-layout {
  --reading-header-height: var(--reading-mobile-header-height);
  --reading-navbar-height: 76px;
  --reading-top-height: calc(var(--reading-header-height) + 18px);
  --reading-bottom-height: calc(var(--reading-navbar-height) + env(safe-area-inset-bottom));
  --reading-scroll-height: calc(100vh - var(--reading-top-height) - var(--reading-bottom-height));

  .reading-header {
    padding: 0 20px;

    :deep(.page-header) {
      margin: 0 -20px;
    }
  }

  .reading-content {
    margin-top: 12px;
  }

  .tablet-header {
    display: none;
  }

  .tablet-navigation {
    display: none;
  }

  @media (width >= 700px) {
    --reading-header-height: 64px;
    --reading-navbar-height: 64px;
    --reading-scroll-height: calc(100vh - 140px - env(safe-area-inset-bottom));

    .reading-header {
      display: none;
    }

    .tablet-header {
      display: flex;
      height: 64px;
      align-items: center;
      padding: 0 24px 0 14px;
      background: #fffdf7;
      gap: 6px;
    }

    .tablet-back {
      display: flex;
      width: 44px;
      height: 44px;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
      background: transparent;

      image {
        width: 24px;
        height: 24px;
      }

      &::after {
        border: 0;
      }
    }

    .tablet-title {
      min-width: 0;
      max-width: 670px;
      flex: 1;
      color: #254733;
      font-size: 18px;
      font-weight: 700;
      line-height: 29px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-navigation {
      display: none;
    }

    .tablet-navigation {
      position: fixed;
      z-index: 30;
      right: 0;
      bottom: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
      background: #fffdf7;
      gap: 24px;
    }

    .tablet-navigation button {
      width: 160px;
      min-height: 40px;
      margin: 0;
      padding: 9px 12px;
      border: 0;
      border-radius: 12px;
      background: #e2eed9;
      color: #254733;
      font-size: 14px;
      line-height: 22px;
    }

    .tablet-navigation .active {
      background: #4e7f3b;
      color: #fff;
    }

    .tablet-navigation button::after {
      border: 0;
    }
  }
}
</style>
