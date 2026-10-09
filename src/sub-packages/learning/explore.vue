<script setup lang="ts">
import ExplorePageView from '@/features/learning/components/explore-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

import type { ExploreProps } from '@/shared/types/learning-components'

withDefaults(defineProps<ExploreProps>(), { initialNotice: false })
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/learning/explore')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ExplorePageView :initial-notice="initialNotice" />
</template>
