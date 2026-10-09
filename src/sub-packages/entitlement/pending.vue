<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
useAnalyticsPage('sub-packages/entitlement/pending')
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.PENDING" title="限时权益待开始" />
</template>
