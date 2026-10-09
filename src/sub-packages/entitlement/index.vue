<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
useAnalyticsPage('sub-packages/entitlement/index')
</script>

<template><EntitlementPageView /></template>
