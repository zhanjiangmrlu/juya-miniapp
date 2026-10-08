<script setup lang="ts">
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

import ExplorePage from './explore.vue'
const { pageStyle, ownsScrollLock } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta v-if="ownsScrollLock" :page-style="pageStyle" />
  <!-- #endif --><ExplorePage initial-notice />
</template>
