<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import AppTabBar, { type TabKey } from '@/components/app-tab-bar/app-tab-bar.vue'
import { resolveNavigationMetrics } from '@/services/navigation-metrics'

let navigationOffset = 0
let safeBottomExtra = 0
try {
  const info = uni.getSystemInfoSync()
  const metrics = resolveNavigationMetrics(
    info.statusBarHeight,
    uni.getMenuButtonBoundingClientRect?.(),
    info.windowWidth
  )
  navigationOffset = Math.max(0, metrics.top + metrics.height - 78)
  safeBottomExtra = Math.max(
    0,
    info.screenHeight - (info.safeArea?.bottom ?? info.screenHeight) - (19 * info.windowWidth) / 390
  )
} catch {
  // 浏览器采用设计导航与底部安全区
}

withDefaults(
  defineProps<{
    active: TabKey
    tier?: 'primary' | 'secondary'
    appearance?: 'default' | 'home'
  }>(),
  { tier: 'primary', appearance: 'default' }
)
</script>

<template>
  <AppPage
    class="tab-layout"
    :class="{ 'home-theme': appearance === 'home' }"
    :padded="appearance !== 'home'"
    :tier="tier"
    :appearance="appearance"
    :style="{
      '--navigation-offset': `${navigationOffset}px`,
      '--safe-bottom-extra': `${safeBottomExtra}px`
    }"
  >
    <view class="tab-content" :class="{ 'home-content': appearance === 'home' }"><slot /></view>
    <AppTabBar :active="active" :appearance="appearance" />
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.tab-layout {
  &.home-theme {
    background: tokens.$home-page;
    color: tokens.$home-ink;
  }
}

.tab-content {
  // 底部留白至少覆盖导航栏高度，避免平板长内容的操作按钮被遮挡
  padding-bottom: calc(max(132rpx, tokens.home-size(76)) + env(safe-area-inset-bottom));

  &.home-content {
    padding-bottom: calc(tokens.home-size(103) + env(safe-area-inset-bottom));
  }
}
</style>
