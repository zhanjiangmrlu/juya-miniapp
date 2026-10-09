<script setup lang="ts">
import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'
import { LimitedEntitlementState } from '@/shared/enums/entitlements'
</script>

<template>
  <EntitlementPageView :state="LimitedEntitlementState.ACTIVE" title="限时学习中" />
</template>
