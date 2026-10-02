<script setup lang="ts">
import { formatFeedbackTime, getFeedbackStatusLabel } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'

import type { FeedbackItem } from '@/shared/contracts/feedback'
defineProps<{ item: FeedbackItem }>()
const emit = defineEmits<{ open: [item: FeedbackItem] }>()
const categories: Record<string, string> = {
  CONTENT: '内容问题',
  PRONUNCIATION: '发音问题',
  DISPLAY: '显示问题',
  FUNCTION: '功能问题'
}
</script>
<template>
  <PersonalRow
    :title="item.title || item.description"
    :detail="`${categories[item.category] || '问题反馈'} · ${getFeedbackStatusLabel(item.status)} · ${formatFeedbackTime(item.created_at)}`"
    :badge="item.status === 'NEEDS_SUPPLEMENT' ? '补充' : '查看'"
    actionable
    @press="emit('open', item)"
  />
</template>
