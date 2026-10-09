<script setup lang="ts">
import PositionPageView from '@/features/scene/components/position-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
useAnalyticsPage('sub-packages/scene/return-source')
</script>
<template><PositionPageView source /></template>
