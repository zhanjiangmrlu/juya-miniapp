<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.PENDING" title="限时权益待开始" />
</template>
