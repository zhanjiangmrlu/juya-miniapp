<script setup lang="ts">
import ProfileDashboard from '@/features/profile/components/profile-dashboard.vue'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif --><ProfileDashboard />
</template>
