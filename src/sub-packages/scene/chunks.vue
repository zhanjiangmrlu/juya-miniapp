<script setup lang="ts">
import EntryPageView from '@/features/scene/components/entry-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { SceneLookupEntryType } from '@/shared/enums/learning'
useAnalyticsPage('sub-packages/scene/chunks')
</script>

<template>
  <EntryPageView :entry-type="SceneLookupEntryType.PHRASE" title="Useful Chunks" />
</template>
