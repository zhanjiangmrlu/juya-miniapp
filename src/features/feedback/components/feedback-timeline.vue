<script setup lang="ts">
import { computed } from 'vue'

import { formatFeedbackTime, presentFeedbackTimeline } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'

import type { FeedbackItem } from '@/shared/contracts/feedback'
const props = defineProps<{ item: FeedbackItem }>()
const entries = computed(() => presentFeedbackTimeline(props.item))
</script>
<template>
  <view class="timeline"
    ><PersonalRow
      v-for="(entry, index) in entries"
      :key="`${entry.at}-${index}`"
      :title="entry.tone === 'service' ? '管理员回复' : index === 0 ? '用户提交' : '补充说明'"
      :detail="`${formatFeedbackTime(entry.at)} · ${entry.text}`"
      :badge="entry.tone === 'service' && item.status === 'NEEDS_SUPPLEMENT' ? '需补充' : '已提交'"
  /></view>
</template>
<style scoped lang="scss">
.timeline {
  display: grid;
  gap: 10px;
}
</style>
