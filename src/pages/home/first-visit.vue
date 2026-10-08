<script setup lang="ts">
import HomeEntryPage from '@/features/home/components/home-entry-page.vue'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle, ownsScrollLock } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta v-if="ownsScrollLock" :page-style="pageStyle" />
  <!-- #endif --><HomeEntryPage mode="first" />
</template>
