<script setup lang="ts">
import { computed } from 'vue'

import { formatFeedbackTime, presentFeedbackTimeline } from '@/features/feedback/feedback-presenter'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import { FEEDBACK_TIMELINE_TITLES } from '@/shared/constants/feedback'
import { FeedbackStatus, FeedbackTimelineTone } from '@/shared/enums/feedback'

import type { FeedbackTimelineProps } from '@/shared/types/feedback-components'
const props = defineProps<FeedbackTimelineProps>()
const entries = computed(() => presentFeedbackTimeline(props.item))
/** 标题按发送方和排序位置选择，tone 为发送方，index 为合并时间线中的位置 */
const getEntryTitle = (tone: FeedbackTimelineTone, index: number) => {
  if (tone === FeedbackTimelineTone.SERVICE) return FEEDBACK_TIMELINE_TITLES.service
  return index === 0 ? FEEDBACK_TIMELINE_TITLES.initial : FEEDBACK_TIMELINE_TITLES.supplement
}
</script>
<template>
  <view class="timeline"
    ><PersonalRow
      v-for="(entry, index) in entries"
      :key="`${entry.at}-${index}`"
      :title="getEntryTitle(entry.tone, index)"
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
