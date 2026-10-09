<script setup lang="ts">
import { formatFeedbackTime } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'

import type { MessageCardEmits, MessageCardProps } from '@/shared/types/messages-components'
defineProps<MessageCardProps>()
const emit = defineEmits<MessageCardEmits>()
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
