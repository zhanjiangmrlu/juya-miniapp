<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
useAnalyticsPage('sub-packages/entitlement/ending')
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.ENDING" title="限时学习即将结束" />
</template>
