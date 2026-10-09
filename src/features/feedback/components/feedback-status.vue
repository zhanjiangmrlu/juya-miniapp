<script setup lang="ts">
import { computed } from 'vue'

import { getFeedbackStatusLabel } from '@/features/feedback/feedback-presenter'

import type { FeedbackStatusProps } from '@/shared/types/feedback-components'

const props = defineProps<FeedbackStatusProps>()
const label = computed(() => getFeedbackStatusLabel(props.status))
</script>

<template>
  <text class="feedback-status" :class="`feedback-status--${status.toLocaleLowerCase()}`">
    {{ label }}
  </text>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.feedback-status {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 14rpx;
  border-radius: tokens.$radius-pill;
  background: tokens.$color-module;
  color: tokens.$color-primary-strong;
  font-size: 21rpx;
  font-weight: 700;

  &--needs_supplement,
  &--reopened {
    background: #fff0da;
    color: tokens.$color-warning;
  }

  &--unresolved_closed {
    background: #fbe8e5;
    color: tokens.$color-danger;
  }
}
</style>
