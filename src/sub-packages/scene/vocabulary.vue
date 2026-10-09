<script setup lang="ts">
import EntryPageView from '@/features/scene/components/entry-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { SceneLookupEntryType } from '@/shared/enums/learning'
useAnalyticsPage('sub-packages/scene/vocabulary')
</script>

<template>
  <EntryPageView :entry-type="SceneLookupEntryType.VOCABULARY" title="重点词汇" />
</template>
