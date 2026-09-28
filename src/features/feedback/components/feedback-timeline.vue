<script setup lang="ts">
import { computed } from 'vue'

import { formatFeedbackTime, presentFeedbackTimeline } from '@/features/feedback/feedback-presenter'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const props = defineProps<{ item: FeedbackItem }>()
const entries = computed(() => presentFeedbackTimeline(props.item))
</script>

<template>
  <view class="feedback-timeline">
    <view
      v-for="(entry, index) in entries"
      :key="`${entry.at}-${index}`"
      class="feedback-timeline__entry"
      :class="`feedback-timeline__entry--${entry.tone}`"
    >
      <view class="feedback-timeline__heading">
        <text class="feedback-timeline__label">{{ entry.label }}</text>
        <text class="feedback-timeline__time">{{ formatFeedbackTime(entry.at) }}</text>
      </view>
      <text class="feedback-timeline__text">{{ entry.text }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.feedback-timeline {
  display: grid;
  gap: 18rpx;

  &__entry {
    position: relative;
    padding: 26rpx 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 78%);

    &--service {
      background: tokens.$color-module;
    }
  }

  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
  }

  &__label {
    font-size: 25rpx;
    font-weight: 700;
  }

  &__time {
    color: tokens.$color-text-muted;
    font-size: 20rpx;
  }

  &__text {
    display: block;
    margin-top: 14rpx;
    font-size: 25rpx;
    line-height: 1.65;
    white-space: pre-wrap;
  }
}
</style>
