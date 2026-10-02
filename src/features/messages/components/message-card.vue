<script setup lang="ts">
import { formatFeedbackTime } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'

import type { MessageItem } from '@/shared/contracts/messages'
defineProps<{ item: MessageItem }>()
const emit = defineEmits<{ open: [item: MessageItem] }>()
</script>
<template>
  <PersonalRow
    :title="item.title"
    :detail="`${item.summary} · ${formatFeedbackTime(item.created_at)}`"
    :badge="item.read_at ? '已读' : '未读'"
    actionable
    @press="emit('open', item)"
  />
</template>
