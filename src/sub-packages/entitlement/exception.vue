<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.EXCEPTION" title="权益确认中" />
</template>
