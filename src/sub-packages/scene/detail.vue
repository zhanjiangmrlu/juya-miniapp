<script setup lang="ts">
import SceneReadingPageView from '@/features/scene/components/scene-reading-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/scene/detail')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <SceneReadingPageView />
</template>
