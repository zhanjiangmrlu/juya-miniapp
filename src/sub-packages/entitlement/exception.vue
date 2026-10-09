<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
useAnalyticsPage('sub-packages/entitlement/exception')
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.EXCEPTION" title="权益确认中" />
</template>
