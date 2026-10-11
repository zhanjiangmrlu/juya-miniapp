<script setup lang="ts">
import SceneWordCard from '@/features/scene/components/scene-word-card.vue'
import { sceneEntryKey } from '@/features/scene/scene-entry-identity'

import type { SceneEntryGridEmits, SceneEntryGridProps } from '@/shared/types/scene-components'
withDefaults(defineProps<SceneEntryGridProps>(), { pendingIds: () => [] })
const emit = defineEmits<SceneEntryGridEmits>()
</script>
<template>
  <view class="scene-word-grid"
    ><SceneWordCard
      v-for="entry in entries"
      :key="sceneEntryKey(entry)"
      :entry="entry"
      :content-version="contentVersion"
      :pending="pendingIds.includes(sceneEntryKey(entry))"
      @favorite="emit('favorite', $event)"
  /></view>
</template>
<style scoped lang="scss">
.scene-word-grid {
  display: grid;
  align-items: stretch;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
