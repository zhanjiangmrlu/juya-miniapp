<script setup lang="ts">
import PersonalRow from '@/features/profile/components/personal-row.vue'

import type { SourceListEmits, SourceListProps } from '@/shared/types/favorites-components'
defineProps<SourceListProps>()
const emit = defineEmits<SourceListEmits>()
/** 打开具备权限的来源，route 为稳定原文定位地址 */
const open = (route: string | null) => {
  if (route) emit('open', route)
}
</script>
<template>
  <view class="source-list"
    ><PersonalRow
      v-for="source in sources"
      :key="`${source.scene_id}:${source.source_locator}`"
      :title="source.scene_title || source.scene_id"
      :detail="`${source.sentence_snapshot} · ${source.returnUrl ? '当前可学习' : '当前无权限'}`"
      :badge="source.returnUrl ? '可进入' : '仅摘要'"
      :actionable="Boolean(source.returnUrl)"
      @press="open(source.returnUrl)"
  /></view>
</template>
<style scoped lang="scss">
.source-list {
  display: grid;
  gap: 10px;
}
</style>
