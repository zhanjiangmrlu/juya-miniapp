<script setup lang="ts">
import { computed } from 'vue'

import { formatFeedbackTime, presentFeedbackTimeline } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import { FeedbackStatus, FeedbackTimelineTone } from '@/shared/enums/feedback'

import type { FeedbackTimelineProps } from '@/shared/types/feedback-components'
const props = defineProps<FeedbackTimelineProps>()
const entries = computed(() => presentFeedbackTimeline(props.item))
</script>
<template>
  <view class="timeline"
    ><PersonalRow
      v-for="(entry, index) in entries"
      :key="`${entry.at}-${index}`"
      :title="
        entry.tone === FeedbackTimelineTone.SERVICE
          ? '管理员回复'
          : index === 0
            ? '用户提交'
            : '补充说明'
      "
      :detail="`${formatFeedbackTime(entry.at)} · ${entry.text}`"
      :badge="
        entry.tone === FeedbackTimelineTone.SERVICE &&
        item.status === FeedbackStatus.NEEDS_SUPPLEMENT
          ? '需补充'
          : '已提交'
      "
  /></view>
</template>
<style scoped lang="scss">
.timeline {
  display: grid;
  gap: 10px;
}
</style>
