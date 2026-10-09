<script setup lang="ts">
import EntryPageView from '@/features/scene/components/entry-page-view.vue'
import { SceneLookupEntryType } from '@/shared/enums/learning'
</script>

<template>
  <EntryPageView :entry-type="SceneLookupEntryType.VOCABULARY" title="重点词汇" />
</template>
