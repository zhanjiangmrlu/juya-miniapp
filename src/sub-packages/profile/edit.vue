<script setup lang="ts">
import ProfileEditor from '@/features/profile/components/profile-editor.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/profile/edit')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ProfileEditor />
</template>
