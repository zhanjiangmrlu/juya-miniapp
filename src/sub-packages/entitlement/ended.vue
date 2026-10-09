<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
useAnalyticsPage('sub-packages/entitlement/ended')
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.ENDED" title="限时学习已结束" />
</template>
