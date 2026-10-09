<script setup lang="ts">
import PageHeader from '@/components/page-header/page-header.vue'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
import { resolveNavigationMetrics } from '@/services/navigation-metrics'

import type { TabKey } from '@/components/app-tab-bar/app-tab-bar.vue'
defineProps<{ active: TabKey }>()
let headerReserve = 78
try {
  const info = uni.getWindowInfo()
  const metrics = resolveNavigationMetrics(
    info.statusBarHeight,
    uni.getMenuButtonBoundingClientRect?.(),
    info.windowWidth
  )
  headerReserve = metrics.top + metrics.height
} catch {
  /* 测试与无系统信息环境使用画板导航高度 */
}
</script>

<template>
  <TabPageLayout
    :active="active"
    appearance="home"
    class="entry-layout"
    :style="{ '--entry-header-reserve': `${headerReserve}px` }"
  >
    <view class="entry-frame">
      <view class="entry-navigation"
        ><PageHeader title="句芽英语" :show-back="false" :centered="false"
      /></view>
      <view class="entry-body"><slot /></view>
    </view>
  </TabPageLayout>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.entry-layout {
  --entry-tab-reserve: max(76px, #{tokens.home-size(76)});

  :deep(.tab-content) {
    padding-bottom: calc(var(--entry-tab-reserve) + env(safe-area-inset-bottom));
  }

  .entry-frame {
    max-width: 680px;
    margin: 0 auto;
  }

  .entry-navigation {
    padding: 0 20px;

    :deep(.page-header) {
      margin: -1px -20px 0;
    }
  }

  .entry-body {
    display: flex;
    min-height: calc(
      100vh - var(--entry-header-reserve) - var(--entry-tab-reserve) - env(safe-area-inset-bottom)
    );
    flex-direction: column;
    padding: 20px 20px 14px;
  }
}
</style>
