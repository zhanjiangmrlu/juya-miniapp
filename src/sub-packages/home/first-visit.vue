<script setup lang="ts">
import HomeEntryPage from '@/features/home/components/home-entry-page.vue'
import { HomeEntryMode } from '@/shared/enums/home'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif --><HomeEntryPage :mode="HomeEntryMode.FIRST" />
</template>
