<script setup lang="ts">
import ProfileDashboard from '@/features/profile/components/profile-dashboard.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('pages/profile/index')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif --><ProfileDashboard />
</template>
