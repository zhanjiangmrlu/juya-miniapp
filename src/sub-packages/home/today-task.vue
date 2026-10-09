<script setup lang="ts">
import HomeEntryPage from '@/features/home/components/home-entry-page.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { HomeEntryMode } from '@/shared/enums/home'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/home/today-task')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif --><HomeEntryPage :mode="HomeEntryMode.TODAY" />
</template>
