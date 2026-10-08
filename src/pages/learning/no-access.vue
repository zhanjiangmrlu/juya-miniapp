<script setup lang="ts">
import ExplorePageView from '@/features/learning/components/explore-page-view.vue'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif --><ExplorePageView initial-notice />
</template>
