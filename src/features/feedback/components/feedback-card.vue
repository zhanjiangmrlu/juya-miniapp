<script setup lang="ts">
import { formatFeedbackTime, getFeedbackStatusLabel } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import { FEEDBACK_CATEGORY_LABELS as categories } from '@/shared/constants/feedback'

import type { FeedbackCardEmits, FeedbackCardProps } from '@/shared/types/feedback-components'
defineProps<FeedbackCardProps>()
const emit = defineEmits<FeedbackCardEmits>()
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
