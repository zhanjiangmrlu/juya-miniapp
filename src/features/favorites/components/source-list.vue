<script setup lang="ts">
import PersonalRow from '@/features/profile/components/personal-row.vue'

import type { SourceListProps } from '@/shared/types/favorites-components'
defineProps<SourceListProps>()
</script>
<template>
  <view class="source-list"
    ><PersonalRow
      v-for="source in sources"
      :key="`${source.scene_id}:${source.source_locator}`"
      :title="source.scene_title || source.scene_id"
      :detail="source.sentence_snapshot"
      badge="已保存"
  /></view>
</template>
<style scoped lang="scss">
.source-list {
  display: grid;
  gap: 10px;
}
</style>
